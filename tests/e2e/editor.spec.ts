import { test, expect } from "@playwright/test";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test("marketing page is responsive and editor can export local edits", async ({
  page,
}, testInfo) => {
  const pdf = await PDFDocument.create();
  const first = pdf.addPage([612, 792]);
  first.drawText("Application form", { x: 60, y: 730, size: 22 });
  const field = pdf.getForm().createTextField("full_name");
  field.addToPage(first, { x: 60, y: 650, width: 220, height: 28 });
  pdf.addPage([420, 595]).drawText("Second page", { x: 40, y: 530, size: 18 });
  const bytes = await pdf.save();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your PDF, finished/ }),
  ).toBeVisible();
  await expect(page.locator(".home-product-desktop")).toHaveJSProperty(
    "naturalWidth",
    1440,
  );
  await page.screenshot({
    path: join(testInfo.outputDir, "home-desktop.png"),
    fullPage: true,
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "application.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  });
  await expect(page.getByText("application.pdf")).toBeVisible();
  await expect(page.locator(".pdf-page")).toHaveCount(2);
  await expect(page.getByLabel("full_name")).toBeVisible();
  await page.getByLabel("full_name").fill("Alex Morgan");
  await page.getByRole("button", { name: "Text tool" }).click();
  await page
    .locator(".pdf-page")
    .first()
    .click({ position: { x: 100, y: 200 } });
  await page.getByLabel("Text annotation").fill("Approved");
  await page.getByLabel("Text annotation").blur();
  await page.getByRole("button", { name: "Sign tool" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const canvas = page.getByLabel("Draw your signature");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("No signature canvas");
  await page.mouse.move(box.x + 50, box.y + 110);
  await page.mouse.down();
  await page.mouse.move(box.x + 105, box.y + 70, { steps: 7 });
  await page.mouse.move(box.x + 175, box.y + 112, { steps: 7 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Use signature" }).click();
  await page
    .locator(".pdf-page")
    .first()
    .click({ position: { x: 200, y: 350 } });
  await expect(page.locator(".annotation--signature")).toHaveCount(1);
  await page.screenshot({
    path: join(testInfo.outputDir, "editor-desktop.png"),
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("application-completed.pdf");
  const saved = await readFile(await download.path());
  const result = await PDFDocument.load(saved);
  expect(result.getPageCount()).toBe(2);
  expect(
    (result.getForm().getField("full_name") as PDFTextField).getText(),
  ).toBe("Alex Morgan");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const parsed = await pdfjs.getDocument({
    data: new Uint8Array(saved),
  }).promise;
  const content = await (await parsed.getPage(1)).getTextContent();
  expect(
    content.items.map((i) => ("str" in i ? i.str : "")).join(" "),
  ).toContain("Approved");
  await parsed.destroy();
});
test("mobile and tablet layouts avoid horizontal overflow", async ({
  page,
}, testInfo) => {
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(
      page.locator(
        width === 390 ? ".home-product-mobile" : ".home-product-desktop",
      ),
    ).toHaveJSProperty("naturalWidth", width === 390 ? 390 : 1440);
    await page.screenshot({
      path: join(testInfo.outputDir, `home-${width}.png`),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.goto("/editor/");
    await page.screenshot({
      path: join(testInfo.outputDir, `editor-empty-${width}.png`),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});
test("loaded mobile editor keeps a usable page and bottom tools", async ({
  page,
}, testInfo) => {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]).drawText("Mobile form", { x: 55, y: 710, size: 20 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor/");
  await page.locator("input[type=file]").setInputFiles({
    name: "mobile.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });
  await expect(page.locator(".pdf-page")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Text tool" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Download/ })).toBeVisible();
  await page.screenshot({
    path: join(testInfo.outputDir, "editor-mobile-loaded.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
test("invalid files fail clearly; annotations move, resize, and undo", async ({
  page,
}) => {
  await page.goto("/editor/");
  await page.locator("input[type=file]").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await expect(page.locator(".editor-error")).toContainText("Choose a PDF");
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  await page.locator("input[type=file]").setInputFiles({
    name: "blank.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });
  await expect(page.locator(".pdf-page")).toHaveCount(1);
  await page.getByRole("button", { name: "Text tool" }).click();
  await page.locator(".pdf-page").click({ position: { x: 120, y: 180 } });
  await page.getByLabel("Text annotation").fill("Move me");
  await page.getByLabel("Text annotation").blur();
  const ann = page.locator(".annotation--text");
  const leftBefore = await ann.evaluate((e) =>
    parseFloat((e as HTMLElement).style.left),
  );
  const handle = page.getByLabel("Move annotation");
  const box = await handle.boundingBox();
  if (!box) throw new Error("No move handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 35,
    box.y + box.height / 2 + 20,
    { steps: 5 },
  );
  await page.mouse.up();
  const leftAfter = await ann.evaluate((e) =>
    parseFloat((e as HTMLElement).style.left),
  );
  expect(leftAfter).toBeGreaterThan(leftBefore + 20);
  await page.getByRole("button", { name: "Undo" }).click();
  expect(
    await ann.evaluate((e) => parseFloat((e as HTMLElement).style.left)),
  ).toBeCloseTo(leftBefore, 0);
  await page.getByRole("button", { name: "Redo" }).click();
  expect(
    await ann.evaluate((e) => parseFloat((e as HTMLElement).style.left)),
  ).toBeCloseTo(leftAfter, 0);
  await ann.click();
  const widthBefore = await ann.evaluate((e) =>
    parseFloat((e as HTMLElement).style.width),
  );
  const resize = page.getByRole("button", { name: "Resize annotation", exact: true });
  const rb = await resize.boundingBox();
  if (!rb) throw new Error("No resize handle");
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await page.mouse.down();
  await page.mouse.move(rb.x + rb.width / 2 + 30, rb.y + rb.height / 2 + 10, {
    steps: 5,
  });
  await page.mouse.up();
  expect(
    await ann.evaluate((e) => parseFloat((e as HTMLElement).style.width)),
  ).toBeGreaterThan(widthBefore + 15);
});
