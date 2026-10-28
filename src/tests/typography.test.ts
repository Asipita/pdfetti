import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, degrees } from "pdf-lib";
import { documentFonts } from "../features/fonts/registry";
import { layoutText } from "../features/fonts/text-layout";
import { exportPdf } from "../features/pdf/export";

const loadFont = (path: string) =>
  readFile(join(process.cwd(), "public", path.slice(1))).then(
    (bytes) => new Uint8Array(bytes),
  );

describe("document fonts", () => {
  it.each(documentFonts)("embeds $name and retains multiline text", async (family) => {
    const source = await PDFDocument.create();
    const page = source.addPage([612, 792]);
    page.drawText("Original vector content", { x: 40, y: 740 });
    const bytes = await exportPdf(
      await source.save(),
      [{
        id: family.id,
        kind: "text",
        page: 1,
        x: 50,
        y: 680,
        width: 240,
        height: 100,
        text: "First line\nSecond line",
        fontId: family.id,
        fontSize: 18,
        color: "#271f22",
        align: "left",
        lineHeight: 1.25,
        bold: false,
        italic: false,
      }],
      {},
      { loadFont },
    );
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const parsed = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      standardFontDataUrl: `${join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts")}/`,
    }).promise;
    const content = await (await parsed.getPage(1)).getTextContent();
    const joined = content.items.map((item) => "str" in item ? item.str : "").join(" ");
    expect(joined).toContain("Original vector content");
    expect(joined).toContain("First line");
    expect(joined).toContain("Second line");
    await parsed.destroy();
  });

  it("wraps long words and preserves explicit blank lines", () => {
    const lines = layoutText("ABCDEF\n\nX", 3, (value) => value.length);
    expect(lines.map((line) => line.text)).toEqual(["ABC", "DEF", "", "X"]);
  });

  it("reports missing glyphs instead of silently exporting a substitute", async () => {
    const source = await PDFDocument.create();
    source.addPage([400, 500]);
    await expect(
      exportPdf(
        await source.save(),
        [{
          id: "unsupported",
          kind: "text",
          page: 1,
          x: 20, y: 400, width: 200, height: 40,
          text: "Hello 🧩",
          fontId: "inter",
          fontSize: 16,
          color: "#271f22",
        }],
        {},
        { loadFont },
      ),
    ).rejects.toThrow(/cannot display/);
  });

  it("keeps custom handwriting text aligned on a rotated page", async () => {
    const source = await PDFDocument.create();
    const page = source.addPage([200, 300]);
    page.setRotation(degrees(90));
    const original = await source.save();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const first = await pdfjs.getDocument({ data: new Uint8Array(original) }).promise;
    const viewport = (await first.getPage(1)).getViewport({ scale: 1 });
    const { viewportRectToPdf } = await import("../features/pdf/coordinates");
    const rect = viewportRectToPdf(viewport, 20, 30, 140, 60);
    await first.destroy();
    const output = await exportPdf(original, [{
      id: "rotated-handwriting", kind: "text", page: 1, ...rect,
      text: "Handwritten\nsecond line", fontId: "patrick-hand", fontSize: 18,
      color: "#BE3144", align: "center", lineHeight: 1.5,
    }], {}, { loadFont });
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(output) }).promise;
    const exportedPage = await parsed.getPage(1);
    const content = await exportedPage.getTextContent();
    const lines = content.items.filter((item) => "str" in item && /Handwritten|second line/.test(item.str));
    expect(lines).toHaveLength(2);
    for (const item of lines) {
      if (!("transform" in item)) continue;
      const transform = pdfjs.Util.transform(viewport.transform, item.transform);
      expect(transform[4]).toBeGreaterThanOrEqual(20);
      expect(transform[4]).toBeLessThan(160);
      expect(transform[5]).toBeGreaterThanOrEqual(30);
      expect(transform[5]).toBeLessThan(90);
      expect(Math.abs(transform[1])).toBeLessThan(1);
    }
    await parsed.destroy();
  });
});
