import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { clampScreenRect, resizeScreenRect, snapScreenRect } from "../features/editor/geometry";
import { rectFromPdf, viewportRectToPdf } from "../features/pdf/coordinates";

describe("annotation geometry", () => {
  it("preserves a PDF location through zoom and page rotation", async () => {
    const source = await PDFDocument.create();
    source.addPage([612, 792]);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(await source.save()) }).promise;
    const page = await parsed.getPage(1);
    for (const rotation of [0, 90, 180, 270]) {
      const normal = page.getViewport({ scale: 1, rotation });
      const doubled = page.getViewport({ scale: 2, rotation });
      const first = viewportRectToPdf(normal, 60, 90, 130, 45);
      const onDoubled = rectFromPdf(doubled, first);
      expect(onDoubled.left).toBeCloseTo(120, 4);
      expect(onDoubled.top).toBeCloseTo(180, 4);
      expect(onDoubled.width).toBeCloseTo(260, 4);
      expect(onDoubled.height).toBeCloseTo(90, 4);
    }
    await parsed.destroy();
  });

  it("clamps oversized elements and keeps proportional resizing within the page", () => {
    expect(clampScreenRect({ left: 400, top: 300, width: 500, height: 400 }, 300, 200))
      .toEqual({ left: 0, top: 0, width: 300, height: 200 });
    const start = { left: 20, top: 30, width: 100, height: 50 };
    const next = resizeScreenRect(start, "se", 500, 500, 300, 200, true);
    expect(next.left).toBeGreaterThanOrEqual(0);
    expect(next.top).toBeGreaterThanOrEqual(0);
    expect(next.left + next.width).toBeLessThanOrEqual(300);
    expect(next.top + next.height).toBeLessThanOrEqual(200);
    expect(next.width / next.height).toBeCloseTo(2, 3);
    const shrunk = resizeScreenRect(start, "nw", 300, 300, 300, 200, true);
    expect(shrunk.width).toBeGreaterThan(0);
    expect(shrunk.height).toBeGreaterThan(0);
  });

  it("snaps to page center and another annotation", () => {
    const viewport = {
      width: 400, height: 500, scale: 1,
      convertToPdfPoint: (x: number, y: number) => [x, 500 - y],
      convertToViewportPoint: (x: number, y: number) => [x, 500 - y],
    };
    const centered = snapScreenRect(
      { left: 147, top: 100, width: 100, height: 40 }, viewport, [], 1, "active",
    );
    expect(centered.rect.left).toBe(150);
    expect(centered.guides.vertical).toBe(200);
    const aligned = snapScreenRect(
      { left: 83, top: 200, width: 50, height: 40 }, viewport,
      [{ id: "other", kind: "check", page: 1, x: 80, y: 400, width: 40, height: 40, color: "#000000" }],
      1, "active",
    );
    expect(aligned.rect.left).toBe(80);
    expect(aligned.guides.vertical).toBe(80);
  });
});
