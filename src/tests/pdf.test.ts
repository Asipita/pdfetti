import { describe, it, expect } from "vitest";
import { PDFDocument, PDFTextField } from "pdf-lib";
import {
  exportPdf,
  completedName,
  screenPointInPdf,
} from "../features/pdf/export";
import { viewportRectToPdf, rectFromPdf } from "../features/pdf/coordinates";

describe("PDF export", () => {
  it("places annotations on their pages and preserves editable form values", async () => {
    const base = await PDFDocument.create();
    base.addPage([612, 792]);
    base.addPage([420, 595]);
    const field = base.getForm().createTextField("applicant");
    field.addToPage(base.getPage(0), { x: 40, y: 640, width: 200, height: 26 });
    const original = await base.save();
    const saved = await exportPdf(
      original,
      [
        {
          id: "a",
          kind: "text",
          page: 2,
          x: 60,
          y: 510,
          width: 200,
          height: 35,
          text: "Approved",
          fontSize: 18,
          color: "#271f22",
        },
        {
          id: "b",
          kind: "check",
          page: 1,
          x: 300,
          y: 700,
          width: 20,
          height: 20,
          color: "#271f22",
        },
      ],
      { applicant: "Alex Morgan" },
    );
    const result = await PDFDocument.load(saved);
    expect(result.getPageCount()).toBe(2);
    expect(
      (result.getForm().getField("applicant") as PDFTextField).getText(),
    ).toBe("Alex Morgan");
    expect(saved.length).toBeGreaterThan(original.length);
  });
  it("writes checkbox, radio, and dropdown values", async () => {
    const base = await PDFDocument.create();
    const page = base.addPage([400, 500]);
    base
      .getForm()
      .createCheckBox("agree")
      .addToPage(page, { x: 20, y: 400, width: 18, height: 18 });
    const radio = base.getForm().createRadioGroup("choice");
    radio.addOptionToPage("yes", page, {
      x: 20,
      y: 350,
      width: 18,
      height: 18,
    });
    radio.addOptionToPage("no", page, { x: 55, y: 350, width: 18, height: 18 });
    const dropdown = base.getForm().createDropdown("country");
    dropdown.addOptions(["NG", "US"]);
    dropdown.addToPage(page, { x: 20, y: 300, width: 100, height: 25 });
    const saved = await exportPdf(await base.save(), [], {
      agree: true,
      choice: "yes",
      country: "NG",
    });
    const result = await PDFDocument.load(saved);
    expect(result.getForm().getCheckBox("agree").isChecked()).toBe(true);
    expect(result.getForm().getRadioGroup("choice").getSelected()).toBe("yes");
    expect(result.getForm().getDropdown("country").getSelected()).toEqual([
      "NG",
    ]);
  });
  it("names completed files consistently", () =>
    expect(completedName("Tax.Form.PDF")).toBe("Tax.Form-completed.pdf"));
});
describe("coordinates", () => {
  it("maps screen checkmark points on rotated pages", () => {
    const a = { id: "r", page: 1, x: 20, y: 120, width: 40, height: 100 };
    expect(screenPointInPdf(a, 90, 0, 0)).toEqual({ x: 20, y: 20 });
    expect(screenPointInPdf(a, 90, 1, 0)).toEqual({ x: 20, y: 120 });
    expect(screenPointInPdf(a, 90, 0, 1)).toEqual({ x: 60, y: 20 });
  });
  it("round trips viewport rectangles through PDF space", () => {
    const vp = {
      scale: 2,
      width: 400,
      height: 600,
      convertToPdfPoint: (x: number, y: number) => [x / 2, 300 - y / 2],
      convertToViewportPoint: (x: number, y: number) => [x * 2, (300 - y) * 2],
    };
    const pdf = viewportRectToPdf(vp, 40, 50, 100, 32);
    const rect = rectFromPdf(vp, pdf);
    expect(rect.left).toBeCloseTo(40);
    expect(rect.top).toBeCloseTo(50);
    expect(rect.width).toBeCloseTo(100);
    expect(rect.height).toBeCloseTo(32);
  });
});

describe("rotated export", () => {
  it("keeps inserted text horizontal in the rotated viewport", async () => {
    const { degrees } = await import("pdf-lib");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const base = await PDFDocument.create();
    const page = base.addPage([200, 300]);
    page.setRotation(degrees(90));
    const original = await base.save();
    const parsed = await pdfjs.getDocument({
      data: new Uint8Array(original),
    }).promise;
    const viewport = (await parsed.getPage(1)).getViewport({ scale: 1 });
    const rect = viewportRectToPdf(viewport, 20, 30, 100, 35);
    await parsed.destroy();
    const output = await exportPdf(
      original,
      [
        {
          id: "rotated",
          kind: "text",
          page: 1,
          ...rect,
          text: "ROTATED",
          fontSize: 16,
          color: "#271f22",
        },
      ],
      {},
    );
    const result = await pdfjs.getDocument({
      data: new Uint8Array(output),
    }).promise;
    const textPage = await result.getPage(1);
    const text = (await textPage.getTextContent()).items.find(
      (i) => "str" in i && i.str === "ROTATED",
    );
    expect(text).toBeTruthy();
    if (text && "transform" in text) {
      const matrix = pdfjs.Util.transform(
        textPage.getViewport({ scale: 1 }).transform,
        text.transform,
      );
      expect(matrix[4]).toBeCloseTo(20, 0);
      expect(matrix[5]).toBeGreaterThan(30);
      expect(Math.abs(matrix[0])).toBeGreaterThan(10);
      expect(Math.abs(matrix[1])).toBeLessThan(1);
    }
    await result.destroy();
  });
});
