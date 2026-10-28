import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function openSample(page: import("@playwright/test").Page) {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]).drawText("ORIGINAL CONTENT", {
    x: 48, y: 730, size: 18,
  });
  await page.goto("/editor/");
  await page.locator("input[type=file]").setInputFiles({
    name: "precision.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator(".pdf-page")).toHaveCount(1);
}

function position(page: import("@playwright/test").Page) {
  return page.locator(".annotation").evaluate((element) => {
    const style = (element as HTMLElement).style;
    return {
      left: parseFloat(style.left),
      top: parseFloat(style.top),
      width: parseFloat(style.width),
      height: parseFloat(style.height),
    };
  });
}

test("handwriting text can be edited, formatted, moved, resized, and exported", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSample(page);
  await page.getByRole("button", { name: "Text tool" }).click();
  await page.locator(".pdf-page").click({ position: { x: 110, y: 180 } });
  const text = page.getByRole("textbox", { name: "Text annotation" });
  await expect(text).toBeFocused();
  await text.fill("This is a handwritten note\nwith a second line.");
  await text.blur();
  await expect(page.locator(".annotation")).toHaveAttribute("data-editing", "false");

  await page.getByRole("combobox", { name: "Document font" }).click();
  await expect(page.getByRole("option", { name: /Caveat/ })).toBeVisible();
  await page.getByRole("option", { name: /Caveat/ }).click();
  await page.getByRole("spinbutton", { name: "Font size" }).fill("22");
  await page.getByRole("spinbutton", { name: "Font size" }).blur();
  await page.getByRole("button", { name: "Align center" }).click();
  await page.getByRole("combobox", { name: "Line height" }).selectOption("1.5");
  await page.getByRole("button", { name: "Text color #BE3144" }).click();
  await expect(text).toHaveCSS("font-family", /PDFetti Caveat/);
  await expect(text).toHaveCSS("text-align", "center");
  await expect(text).toHaveCSS("color", "rgb(190, 49, 68)");
  await expect(page.getByRole("button", { name: "Bold" })).toBeDisabled();

  const before = await position(page);
  const resize = page.getByRole("button", { name: "Resize annotation e" });
  const handle = await resize.boundingBox();
  if (!handle) throw new Error("Missing resize handle");
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 80, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();
  const resized = await position(page);
  expect(resized.width).toBeGreaterThan(before.width + 65);
  await expect(text).toHaveCSS("font-size", /\d+px/);
  await page.getByRole("button", { name: "Undo" }).click();
  expect((await position(page)).width).toBeCloseTo(before.width, 0);
  await page.getByRole("button", { name: "Redo" }).click();
  expect((await position(page)).width).toBeCloseTo(resized.width, 0);

  const move = page.getByRole("button", { name: "Move annotation" });
  const grip = await move.boundingBox();
  if (!grip) throw new Error("Missing move handle");
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 65, grip.y + grip.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  const moved = await position(page);
  expect(moved.left).toBeGreaterThan(resized.left + 50);
  await page.getByRole("button", { name: "Undo" }).click();
  expect((await position(page)).left).toBeCloseTo(resized.left, 0);
  await page.getByRole("button", { name: "Redo" }).click();
  expect((await position(page)).left).toBeCloseTo(moved.left, 0);

  const pageWidth = await page.locator(".pdf-page").evaluate((el) => el.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(async () => {
    const width = await page.locator(".pdf-page").evaluate((el) => el.getBoundingClientRect().width);
    return (await position(page)).left / width;
  })
    .toBeCloseTo(moved.left / pageWidth, 2);
  for (const zoom of ["0.5", "0.75", "1", "1.5", "2"]) {
    await page.getByRole("combobox", { name: "Zoom level" }).selectOption(zoom);
    await expect.poll(async () => {
      const width = await page.locator(".pdf-page").evaluate((el) => el.getBoundingClientRect().width);
      return (await position(page)).left / width;
    }).toBeCloseTo(moved.left / pageWidth, 2);
  }
  await page.getByRole("combobox", { name: "Zoom level" }).selectOption("1");
  await page.screenshot({ path: join(testInfo.outputDir, "precision-desktop.png") });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download/ }).click();
  const download = await downloadPromise;
  const saved = await readFile(await download.path());
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const parsed = await pdfjs.getDocument({ data: new Uint8Array(saved) }).promise;
  const content = await (await parsed.getPage(1)).getTextContent();
  const allText = content.items.map((item) => "str" in item ? item.str : "").join(" ");
  expect(allText).toContain("ORIGINAL CONTENT");
  expect(allText).toContain("handwritten note");
  expect(allText).toContain("second line");
  await parsed.destroy();
  await page.locator("input[type=file]").setInputFiles({
    name: "exported-precision.pdf",
    mimeType: "application/pdf",
    buffer: saved,
  });
  await expect(page.locator(".pdf-page")).toHaveCount(1);
  await expect(page.locator(".file-title")).toHaveText("exported-precision.pdf");
  await expect.poll(() => page.locator(".pdf-page canvas").evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels) return false;
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i] > 120 && pixels[i] > pixels[i + 1] * 1.3 && pixels[i] > pixels[i + 2] * 1.2)
        return true;
    return false;
  })).toBe(true);
  await page.screenshot({ path: join(testInfo.outputDir, "precision-exported.png") });
});

test("text preferences carry into a new annotation and shortcuts respect editing", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openSample(page);
  await page.getByRole("button", { name: "Text tool" }).click();
  await page.locator(".pdf-page").click({ position: { x: 100, y: 140 } });
  const first = page.getByRole("textbox", { name: "Text annotation" });
  await first.fill("First");
  await first.blur();
  await page.getByRole("combobox", { name: "Document font" }).click();
  await page.getByRole("option", { name: /Patrick Hand/ }).click();
  await page.getByRole("button", { name: "Text color #1F5A82" }).click();
  await page.getByRole("button", { name: "Text tool" }).click();
  await page.locator(".pdf-page").click({ position: { x: 100, y: 230 } });
  const second = page.getByRole("textbox", { name: "Text annotation" }).last();
  await expect(second).toBeFocused();
  await expect(second).toHaveCSS("font-family", /PDFetti Patrick Hand/);
  await expect(second).toHaveCSS("color", "rgb(31, 90, 130)");
  await second.fill("Second\nline");
  await second.press("ArrowLeft");
  await expect(second).toHaveValue("Second\nline");
  await second.press("Escape");
  await expect(page.locator(".annotation").last()).toHaveAttribute("data-editing", "false");
  const before = await page.locator(".annotation").last().evaluate((el) => parseFloat((el as HTMLElement).style.left));
  await page.keyboard.press("ArrowRight");
  const after = await page.locator(".annotation").last().evaluate((el) => parseFloat((el as HTMLElement).style.left));
  expect(after).toBeGreaterThan(before);
  await page.keyboard.press("ControlOrMeta+z");
  expect(await page.locator(".annotation").last().evaluate((el) => parseFloat((el as HTMLElement).style.left))).toBeCloseTo(before, 0);
  await page.keyboard.press("ControlOrMeta+y");
  expect(await page.locator(".annotation").last().evaluate((el) => parseFloat((el as HTMLElement).style.left))).toBeCloseTo(after, 0);
  await page.screenshot({ path: join(testInfo.outputDir, "precision-tablet.png") });
});

test("mobile text placement and selection remain usable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSample(page);
  await page.getByRole("button", { name: "Text tool" }).click();
  await page.locator(".pdf-page").click({ position: { x: 48, y: 100 } });
  const text = page.getByRole("textbox", { name: "Text annotation" });
  await text.fill("A handwritten note\nfor this form");
  await text.blur();
  await page.getByRole("combobox", { name: "Document font" }).click();
  await page.getByRole("option", { name: /Patrick Hand/ }).click();
  await expect(page.getByRole("button", { name: "Move annotation" })).toBeVisible();
  await page.screenshot({ path: join(testInfo.outputDir, "precision-mobile.png"), fullPage: true });
});

test("cancelling a drag restores the element and page edges constrain movement", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await openSample(page);
  await page.getByRole("button", { name: "Check tool" }).click();
  await page.locator(".pdf-page").click({ position: { x: 100, y: 150 } });
  const before = await position(page);
  const annotation = page.locator(".annotation");
  const box = await annotation.boundingBox();
  if (!box) throw new Error("Missing annotation");
  await page.mouse.move(box.x + 12, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 50, { steps: 4 });
  await annotation.evaluate((node) => node.dispatchEvent(new PointerEvent("pointercancel", {
    bubbles: true, pointerId: 1, pointerType: "mouse",
  })));
  await page.mouse.up();
  expect(await position(page)).toEqual(before);
  await annotation.click();

  const move = page.getByRole("button", { name: "Move annotation" });
  const grip = await move.boundingBox();
  if (!grip) throw new Error("Missing move control");
  const pageBox = await page.locator(".pdf-page").boundingBox();
  if (!pageBox) throw new Error("Missing PDF page");
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(pageBox.x + 2, pageBox.y - 20, { steps: 4 });
  await page.mouse.up();
  const atTopLeft = await position(page);
  expect(atTopLeft.left).toBeCloseTo(0, 0);
  expect(atTopLeft.top).toBeCloseTo(0, 0);
  const pageRect = await page.locator(".pdf-page").evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height,
  }));
  const secondGrip = await move.boundingBox();
  if (!secondGrip) throw new Error("Missing move control");
  await page.mouse.move(secondGrip.x + secondGrip.width / 2, secondGrip.y + secondGrip.height / 2);
  await page.mouse.down();
  await page.mouse.move(pageBox.x + pageBox.width - 2, pageBox.y + pageBox.height - 2, { steps: 4 });
  await page.mouse.up();
  const atBottomRight = await position(page);
  expect(atBottomRight.left + atBottomRight.width).toBeCloseTo(pageRect.width, 0);
  expect(atBottomRight.top + atBottomRight.height).toBeCloseTo(pageRect.height, 0);
});

test("touch input can drag a selected annotation", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  try {
    await openSample(page);
    await page.getByRole("button", { name: "Check tool" }).click();
    const pdf = await page.locator(".pdf-page").boundingBox();
    if (!pdf) throw new Error("Missing PDF page");
    await page.touchscreen.tap(pdf.x + 60, pdf.y + 110);
    const before = await position(page);
    const grip = await page.getByRole("button", { name: "Move annotation" }).boundingBox();
    if (!grip) throw new Error("Missing touch move control");
    const x = grip.x + grip.width / 2, y = grip.y + grip.height / 2;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart", touchPoints: [{ x, y, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x: x + 50, y: y + 25, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const after = await position(page);
    expect(after.left).toBeGreaterThan(before.left + 35);
    expect(after.top).toBeGreaterThan(before.top + 15);
  } finally {
    await context.close();
  }
});
