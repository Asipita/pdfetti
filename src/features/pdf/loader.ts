import type { PDFDocumentProxy } from "pdfjs-dist";
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
export function getPdfjs() {
  if (!pdfjsPromise)
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  return pdfjsPromise;
}
export async function loadPdf(
  bytes: Uint8Array,
  password?: string,
): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  return pdfjs.getDocument({
    data: new Uint8Array(bytes),
    password,
    useSystemFonts: true,
    standardFontDataUrl: "/standard_fonts/",
    cMapUrl: "/cmaps/",
    cMapPacked: true,
    wasmUrl: "/wasm/",
  }).promise;
}
