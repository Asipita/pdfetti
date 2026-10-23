import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
} from "pdf-lib";
import type {
  Annotation,
  FormValue,
  AnnotationBase,
} from "@/features/editor/types";
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
function textOrigin(
  a: AnnotationBase,
  angle: number,
  fontSize: number,
  line: number,
) {
  const delta = fontSize * (line + 1) * 1.2;
  switch (normalizedRotation(angle)) {
    case 90:
      return { x: a.x + delta, y: a.y - a.height };
    case 180:
      return { x: a.x + a.width, y: a.y - a.height + delta };
    case 270:
      return { x: a.x + a.width - delta, y: a.y };
    default:
      return { x: a.x, y: a.y - delta };
  }
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
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
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
      const lines = a.text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        try {
          page.drawText(lines[i], {
            ...textOrigin(a, angle, a.fontSize, i),
            size: a.fontSize,
            font,
            color: color(a.color),
            rotate: degrees(angle),
            maxWidth: angle === 90 || angle === 270 ? a.height : a.width,
          });
        } catch {
          throw new Error(
            "This text contains characters the PDF font cannot encode. Please use basic Latin characters for this export.",
          );
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
      const image = a.dataUrl.startsWith("data:image/jpeg")
        ? await doc.embedJpg(a.dataUrl)
        : await doc.embedPng(a.dataUrl);
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
