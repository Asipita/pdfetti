import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  type PDFFont,
} from "pdf-lib";
import fontkit, { type Font as FontkitFont } from "@pdf-lib/fontkit";
import type {
  Annotation,
  FormValue,
  AnnotationBase,
} from "@/features/editor/types";
import { getDocumentFont, fontStyle, resolveTextFormatting } from "@/features/fonts/registry";
import { layoutText } from "@/features/fonts/text-layout";
const color = (hex: string) => {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
};
export function normalizedRotation(angle: number) {
  return ((angle % 360) + 360) % 360;
}
export function screenPointInPdf(
  a: AnnotationBase,
  angle: number,
  fx: number,
  fy: number,
) {
  switch (normalizedRotation(angle)) {
    case 90:
      return { x: a.x + fy * a.width, y: a.y - a.height + fx * a.height };
    case 180:
      return {
        x: a.x + a.width - fx * a.width,
        y: a.y - a.height + fy * a.height,
      };
    case 270:
      return { x: a.x + a.width - fy * a.width, y: a.y - fx * a.height };
    default:
      return { x: a.x + fx * a.width, y: a.y - fy * a.height };
  }
}
function textPoint(
  a: AnnotationBase, angle: number, x: number, y: number,
) {
  const rotated = angle === 90 || angle === 270;
  const visibleWidth = rotated ? a.height : a.width;
  const visibleHeight = rotated ? a.width : a.height;
  return screenPointInPdf(a, angle, x / visibleWidth, y / visibleHeight);
}
function imagePlacement(a: AnnotationBase, angle: number) {
  switch (normalizedRotation(angle)) {
    case 90:
      return {
        x: a.x + a.width,
        y: a.y - a.height,
        width: a.height,
        height: a.width,
      };
    case 180:
      return { x: a.x + a.width, y: a.y, width: a.width, height: a.height };
    case 270:
      return { x: a.x, y: a.y, width: a.height, height: a.width };
    default:
      return { x: a.x, y: a.y - a.height, width: a.width, height: a.height };
  }
}
export async function exportPdf(
  bytes: Uint8Array,
  annotations: Annotation[],
  forms: Record<string, FormValue>,
  options: { loadFont?: (path: string) => Promise<Uint8Array> } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const legacyFont = await doc.embedFont(StandardFonts.Helvetica);
  doc.registerFontkit(fontkit);
  const fontCache = new Map<string, Promise<{ pdf: PDFFont; source: FontkitFont }>>();
  const loadFont = options.loadFont || (async (path: string) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load document font: ${path}`);
    return new Uint8Array(await response.arrayBuffer());
  });
  function embeddedFont(path: string): Promise<{ pdf: PDFFont; source: FontkitFont }> {
    if (!fontCache.has(path))
      fontCache.set(path, loadFont(path).then(async (data) => ({
        // pdf-lib/fontkit currently writes invalid subsets for some bundled faces.
        // Disable shaping features whose positioning it cannot reproduce in PDF text.
        pdf: await doc.embedFont(data, {
          subset: false,
          features: { liga: false, clig: false, calt: false, kern: false },
        }),
        source: fontkit.create(data),
      })));
    return fontCache.get(path)!;
  }
  const imageCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>();
  const form = doc.getForm();
  for (const [name, value] of Object.entries(forms)) {
    let field;
    try {
      field = form.getField(name);
    } catch {
      continue;
    }
    try {
      if (field instanceof PDFTextField && typeof value === "string")
        field.setText(value);
      else if (field instanceof PDFCheckBox)
        value ? field.check() : field.uncheck();
      else if (field instanceof PDFRadioGroup && typeof value === "string")
        field.select(value);
      else if (field instanceof PDFDropdown && typeof value === "string")
        field.select(value);
    } catch (e) {
      throw new Error(
        `Could not save form field “${name}”. ${(e as Error).message}`,
      );
    }
  }
  for (const a of annotations) {
    const page = doc.getPage(a.page - 1);
    if (!page) continue;
    const angle = normalizedRotation(page.getRotation().angle);
    if (a.kind === "text") {
      const format = resolveTextFormatting(a);
      const family = getDocumentFont(format.fontId);
      const style = fontStyle(family, format);
      if (
        (format.bold && style !== "bold" && style !== "boldItalic") ||
        (format.italic && style !== "italic" && style !== "boldItalic")
      ) throw new Error(`${family.name} does not support the selected text style.`);
      const path = family.assets[style];
      const embedded = a.fontId && path ? await embeddedFont(path) : null;
      const font = embedded?.pdf || legacyFont;
      if (embedded)
        for (const char of a.text) {
          if (char === "\n" || char === "\r") continue;
          if (!embedded.source.hasGlyphForCodePoint(char.codePointAt(0)!))
            throw new Error(`${family.name} cannot display “${char}”. Choose another font or remove that character.`);
        }
      const boxWidth = angle === 90 || angle === 270 ? a.height : a.width;
      let lines;
      try {
        lines = layoutText(
          a.text,
          boxWidth,
          (text) => font.widthOfTextAtSize(text, format.fontSize),
        );
      } catch {
        throw new Error(`${family.name} cannot encode one or more characters in this annotation.`);
      }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.text) continue;
        const x = format.align === "center"
          ? (boxWidth - line.width) / 2
          : format.align === "right"
            ? boxWidth - line.width
            : 0;
        const y = format.fontSize * 0.86 +
          (format.lineHeight - 1) * format.fontSize / 2 +
          i * format.fontSize * format.lineHeight;
        try {
          page.drawText(line.text, {
            ...textPoint(a, angle, x, y),
            size: format.fontSize,
            font,
            color: color(format.color),
            rotate: degrees(angle),
          });
        } catch {
          throw new Error(`${family.name} cannot encode one or more characters in this annotation.`);
        }
      }
    } else if (a.kind === "check") {
      const p = screenPointInPdf(a, angle, 0.12, 0.52),
        q = screenPointInPdf(a, angle, 0.4, 0.82),
        r = screenPointInPdf(a, angle, 0.9, 0.12);
      const thickness = Math.max(1, Math.min(a.width, a.height) * 0.1);
      page.drawLine({ start: p, end: q, thickness, color: color(a.color) });
      page.drawLine({ start: q, end: r, thickness, color: color(a.color) });
    } else if (a.kind === "signature") {
      let image = imageCache.get(a.dataUrl);
      if (!image) {
        image = a.dataUrl.startsWith("data:image/jpeg")
          ? await doc.embedJpg(a.dataUrl)
          : await doc.embedPng(a.dataUrl);
        imageCache.set(a.dataUrl, image);
      }
      page.drawImage(image, {
        ...imagePlacement(a, angle),
        rotate: degrees(angle),
      });
    } else if (a.kind === "draw") {
      for (let i = 1; i < a.points.length; i++) {
        const p = a.points[i - 1],
          q = a.points[i];
        page.drawLine({
          start: { x: p.x, y: p.y },
          end: { x: q.x, y: q.y },
          thickness: a.strokeWidth,
          color: color(a.color),
        });
      }
    }
  }
  return doc.save({ useObjectStreams: false });
}
export function completedName(name: string) {
  return `${name.replace(/\.pdf$/i, "")}-completed.pdf`;
}
