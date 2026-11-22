import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

const w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const rels = "http://schemas.openxmlformats.org/package/2006/relationships";
const mime =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function form() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${r}/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file("customXml/item1.xml", "<original>Preserve me</original>");
  zip.file(
    "word/document.xml",
    `<w:document xmlns:w="${w}"><w:body>
    <w:p><w:r><w:t>Consent form</w:t></w:r></w:p><w:p><w:r><w:br w:type="page"/><w:t>Approval</w:t></w:r></w:p>
    <w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="3600"/><w:gridCol w:w="5760"/></w:tblGrid>
    <w:tr><w:tc><w:tcPr><w:tcW w:w="3600" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Reviewer</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="5760" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Signature field</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
    </w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

test("drag signatures to Word fields and download an editable signed copy", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /Open the editor/i })
    .first()
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "consent.docx",
    mimeType: mime,
    buffer: await form(),
  });
  const preview = page.frameLocator('iframe[title="Word document preview"]');
  const pages = preview.locator("section.docx");
  await expect(pages).toHaveCount(2);
  const add = page.getByRole("button", { name: "Add signature" });
  await add.click();
  await page.getByRole("tab", { name: "Type" }).click();
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page.getByRole("button", { name: "Use signature" }).click();
  const first = preview.getByRole("button", { name: "Signature 1" });
  const initial = await first.boundingBox();
  if (!initial) throw new Error("Missing signature");
  const field = preview.getByText("Signature field", { exact: true });
  await page.mouse.move(initial.x + 5, initial.y + 5);
  await page.mouse.down();
  await field.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const target = await field.boundingBox();
  if (!target) throw new Error("Missing table field");
  await page.mouse.move(target.x + 65, target.y + 9, { steps: 5 });
  await page.mouse.up();
  await expect(
    pages.nth(1).getByRole("button", { name: "Signature 1" }),
  ).toBeVisible();
  const moved = await first.boundingBox();
  expect(moved!.x).toBeCloseTo(target.x + 60, 0);
  expect(moved!.y).toBeCloseTo(target.y + 4, 0);

  // Resizing the viewport must not affect the exported offsets or dimensions.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      pages.first().evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBeLessThan(390);
  await page.getByRole("button", { name: "Place again" }).click();
  await expect(preview.locator(".placed-signature")).toHaveCount(2);
  await page.getByRole("button", { name: "Delete selected signature" }).click();
  await expect(preview.locator(".placed-signature")).toHaveCount(1);
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download signed Word document" })
    .click();
  const output = await downloading;
  expect(output.suggestedFilename()).toBe("consent-signed.docx");
  const path = testInfo.outputPath("consent-signed.docx");
  await output.saveAs(path);
  const zip = await JSZip.loadAsync(await readFile(path));
  const xml = await zip.file("word/document.xml")!.async("string");
  const report = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const anchor = doc.getElementsByTagNameNS("*", "anchor")[0];
    return {
      cell: anchor?.closest("tc")?.textContent,
      offset: Array.from(
        doc.getElementsByTagNameNS("*", "posOffset"),
        (el) => Number(el.textContent) / 9525,
      ),
      width:
        Number(
          doc.getElementsByTagNameNS("*", "extent")[0]?.getAttribute("cx"),
        ) / 9525,
      anchors: doc.getElementsByTagNameNS("*", "anchor").length,
      markers: doc.getElementsByTagNameNS("*", "bookmarkStart").length,
    };
  }, xml);
  expect(report.cell).toContain("Signature field");
  expect(report.offset[0]).toBeCloseTo(60, 0);
  expect(Math.abs(report.offset[1] - 4)).toBeLessThan(1);
  expect(report.width).toBe(180);
  expect(report.anchors).toBe(1);
  expect(report.markers).toBe(0);
  expect(await zip.file("customXml/item1.xml")!.async("string")).toBe(
    "<original>Preserve me</original>",
  );
  expect(zip.file(/word\/media\/.*\.png/)).toHaveLength(1);
});

test.describe("touch signing", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("draw, drag, resize and reuse a signature on a phone", async ({
    page,
    context,
  }) => {
    await page.goto("/editor/");
    const input = page.locator("input[type=file]");
    await input.setInputFiles({
      name: "broken.docx",
      mimeType: mime,
      buffer: Buffer.from("invalid file"),
    });
    await expect(
      page.getByRole("alert").filter({ hasText: "Could not open" }),
    ).toBeVisible();
    await input.setInputFiles({
      name: "form.docx",
      mimeType: mime,
      buffer: await form(),
    });
    const preview = page.frameLocator('iframe[title="Word document preview"]');
    await page.getByRole("button", { name: "Add signature" }).tap();
    const canvas = await page.getByLabel("Draw your signature").boundingBox();
    if (!canvas) throw new Error("Missing signature pad");
    const cdp = await context.newCDPSession(page);
    async function stroke(x: number, y: number, dx: number, dy: number) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let step = 1; step <= 4; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: x + (dx * step) / 4, y: y + (dy * step) / 4, id: 1 },
          ],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    await stroke(canvas.x + 25, canvas.y + 60, 90, -20);
    await page.getByRole("button", { name: "Use signature" }).tap();
    const mark = preview.getByRole("button", { name: "Signature 1" });
    const initial = await mark.boundingBox();
    if (!initial) throw new Error("Missing signature");
    await stroke(initial.x + 6, initial.y + 6, 42, -50);
    const moved = await mark.boundingBox();
    expect(Math.abs(moved!.x - initial.x - 42)).toBeLessThan(2);
    expect(Math.abs(moved!.y - initial.y + 50)).toBeLessThan(2);
    await page.getByLabel("Signature size").press("ArrowRight");
    await expect
      .poll(async () => (await mark.boundingBox())?.width)
      .toBeGreaterThan(moved!.width);
    await page.getByRole("button", { name: "Place again" }).tap();
    await expect(preview.locator(".placed-signature")).toHaveCount(2);
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download signed Word document" })
      .tap();
    const signed = await readFile(await (await downloading).path());
    const zip = await JSZip.loadAsync(signed);
    expect(
      (await zip.file("word/document.xml")!.async("string")).match(
        /<wp:anchor /g,
      ),
    ).toHaveLength(2);
    expect(zip.file(/word\/media\/.*\.png/)).toHaveLength(1);
    await input.setInputFiles({
      name: "signed.docx",
      mimeType: mime,
      buffer: signed,
    });
    await expect(preview.locator("article img")).toHaveCount(2);
  });
});
