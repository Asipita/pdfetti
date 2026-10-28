import type { TextAnnotation, TextFormatting } from "@/features/editor/types";

export type FontStyle = "regular" | "bold" | "italic" | "boldItalic";
export type DocumentFont = {
  id: string;
  name: string;
  category: "Professional" | "Handwriting";
  cssFamily: string;
  assets: Partial<Record<FontStyle, string>>;
};

export const documentFonts: readonly DocumentFont[] = [
  {
    id: "inter",
    name: "Inter",
    category: "Professional",
    cssFamily: "PDFetti Document Inter",
    assets: {
      regular: "/document-fonts/inter/Inter-Regular.ttf",
      bold: "/document-fonts/inter/Inter-Bold.ttf",
    },
  },
  {
    id: "source-serif",
    name: "Source Serif 4",
    category: "Professional",
    cssFamily: "PDFetti Source Serif",
    assets: {
      regular: "/document-fonts/sourceserif4/SourceSerif4[opsz,wght].ttf",
      italic:
        "/document-fonts/sourceserif4/SourceSerif4-Italic[opsz,wght].ttf",
    },
  },
  {
    id: "plex-mono",
    name: "IBM Plex Mono",
    category: "Professional",
    cssFamily: "PDFetti Plex Mono",
    assets: {
      regular: "/document-fonts/ibmplexmono/IBMPlexMono-Regular.ttf",
      bold: "/document-fonts/ibmplexmono/IBMPlexMono-Bold.ttf",
      italic: "/document-fonts/ibmplexmono/IBMPlexMono-Italic.ttf",
      boldItalic: "/document-fonts/ibmplexmono/IBMPlexMono-BoldItalic.ttf",
    },
  },
  {
    id: "caveat",
    name: "Caveat",
    category: "Handwriting",
    cssFamily: "PDFetti Caveat",
    assets: {
      regular: "/document-fonts/caveat/Caveat[wght].ttf",
    },
  },
  {
    id: "patrick-hand",
    name: "Patrick Hand",
    category: "Handwriting",
    cssFamily: "PDFetti Patrick Hand",
    assets: {
      regular: "/document-fonts/patrickhand/PatrickHand-Regular.ttf",
    },
  },
];

export const defaultTextFormatting: TextFormatting = {
  fontId: "inter",
  fontSize: 16,
  color: "#271f22",
  align: "left",
  lineHeight: 1.25,
  bold: false,
  italic: false,
};

export function resolveTextFormatting(
  annotation: Partial<TextAnnotation> | Partial<TextFormatting>,
): TextFormatting {
  return {
    fontId: annotation.fontId || defaultTextFormatting.fontId,
    fontSize: annotation.fontSize ?? defaultTextFormatting.fontSize,
    color: annotation.color || defaultTextFormatting.color,
    align: annotation.align || defaultTextFormatting.align,
    lineHeight: annotation.lineHeight ?? defaultTextFormatting.lineHeight,
    bold: annotation.bold ?? defaultTextFormatting.bold,
    italic: annotation.italic ?? defaultTextFormatting.italic,
  };
}

export function getDocumentFont(id: string): DocumentFont {
  return documentFonts.find((font) => font.id === id) || documentFonts[0];
}

export function fontStyle(
  font: DocumentFont,
  format: Pick<TextFormatting, "bold" | "italic">,
): FontStyle {
  if (format.bold && format.italic && font.assets.boldItalic)
    return "boldItalic";
  if (format.bold && font.assets.bold) return "bold";
  if (format.italic && font.assets.italic) return "italic";
  return "regular";
}

export function supportsFontStyle(
  font: DocumentFont,
  style: "bold" | "italic",
): boolean {
  return Boolean(font.assets[style]);
}
