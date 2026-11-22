import JSZip from "jszip";
import { renderAsync } from "docx-preview";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const WP =
  "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
const RELS = "http://schemas.openxmlformats.org/package/2006/relationships";
const TYPES = "http://schemas.openxmlformats.org/package/2006/content-types";
const serialize = (doc: Document) => new XMLSerializer().serializeToString(doc);
const emu = (pixels: number) => Math.round(pixels * 9525);
const wordMime =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function readXml(zip: JSZip, path: string) {
  const part = zip.file(path);
  if (!part) throw new Error("The Word document is missing a required part.");
  const doc = new DOMParser().parseFromString(
    await part.async("string"),
    "application/xml",
  );
  if (doc.getElementsByTagName("parsererror").length)
    throw new Error("The Word document contains invalid XML.");
  return doc;
}

// These locations are reconstructed from the unmodified source on every export.
// A break can occur in the middle of a run, including at the top of a new page.
function anchorLocations(doc: Document) {
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("The Word document is missing its body.");
  if (!body.getElementsByTagNameNS(W, "p").length) {
    body.insertBefore(doc.createElementNS(W, "w:p"), body.firstChild);
  }
  return Array.from(doc.getElementsByTagNameNS(W, "*")).filter(
    (node) =>
      node.localName === "p" ||
      node.localName === "lastRenderedPageBreak" ||
      node.localName === "br",
  );
}

function insertAt(location: Element, run: Element) {
  if (location.localName === "p") {
    const properties = Array.from(location.children).find(
      (child) => child.localName === "pPr",
    );
    location.insertBefore(
      run,
      properties ? properties.nextSibling : location.firstChild,
    );
  } else {
    // At a page break the drawing belongs to the continuation of this run.
    location.after(...Array.from(run.childNodes));
  }
}

function previewBookmark(location: Element, index: number, prefix: string) {
  const doc = location.ownerDocument;
  const mark = doc.createElementNS(W, "w:bookmarkStart");
  mark.setAttributeNS(W, "w:name", prefix + index);
  mark.setAttributeNS(W, "w:id", String(index));
  if (location.localName === "p") {
    insertAt(location, mark);
  } else {
    const run = location.parentElement!;
    const remainder = run.cloneNode(false) as Element;
    const properties = Array.from(run.children).find(
      (child) => child.localName === "rPr",
    );
    if (properties) remainder.append(properties.cloneNode(true));
    while (location.nextSibling) remainder.append(location.nextSibling);
    run.after(mark, remainder);
  }
}

export type WordPreview = {
  pages: HTMLElement[];
  anchors: { index: number; mark: HTMLElement; page: HTMLElement }[];
  mainPath: string;
};

export async function previewWord(
  file: File,
  container: HTMLElement,
): Promise<WordPreview> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const root = await readXml(zip, "_rels/.rels");
  const main = Array.from(root.documentElement.children).find(
    (rel) => rel.getAttribute("Type") === R + "/officeDocument",
  );
  const mainPath = main?.getAttribute("Target")?.replace(/^\//, "");
  if (!mainPath) throw new Error("This file is not a supported Word document.");
  const doc = await readXml(zip, mainPath);
  if (doc.documentElement.namespaceURI !== W)
    throw new Error(
      "This Word format is unsupported. Save a copy as a standard .docx file.",
    );
  const prefix = "pdfetti" + crypto.randomUUID().replace(/-/g, "") + "_";
  anchorLocations(doc).forEach((location, index) =>
    previewBookmark(location, index, prefix),
  );
  zip.file(mainPath, serialize(doc));
  await renderAsync(
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    container,
    undefined,
    {
      ignoreLastRenderedPageBreak: false,
      renderAltChunks: false,
      useBase64URL: true,
    },
  );
  const pages = Array.from(
    container.querySelectorAll<HTMLElement>(".docx-wrapper > section.docx"),
  );
  const anchors = pages.flatMap((page) =>
    Array.from(
      page.querySelectorAll<HTMLElement>(`article [id^="${prefix}"]`),
      (mark) => ({ index: Number(mark.id.slice(prefix.length)), mark, page }),
    ),
  );
  if (!anchors.length)
    throw new Error(
      "No editable document text or fields were found in this Word file.",
    );
  return { pages, anchors, mainPath };
}

export type WordSignature = {
  id: string;
  url: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

function drawing(
  doc: Document,
  id: number,
  relId: string,
  x: number,
  y: number,
  signature: WordSignature,
) {
  const cx = emu(signature.width),
    cy = emu(signature.height);
  // Coordinates are local to the line/character beside the field, including inside tables.
  const xml = `<w:r xmlns:w="${W}" xmlns:wp="${WP}" xmlns:a="${A}" xmlns:pic="${PIC}" xmlns:r="${R}">
    <w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
    <wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="character"><wp:posOffset>${emu(x)}</wp:posOffset></wp:positionH>
    <wp:positionV relativeFrom="line"><wp:posOffset>${emu(y)}</wp:posOffset></wp:positionV>
    <wp:extent cx="${cx}" cy="${cy}"/><wp:wrapNone/><wp:docPr id="${id}" name="Signature ${id}"/>
    <a:graphic><a:graphicData uri="${PIC}"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Signature"/><pic:cNvPicPr/></pic:nvPicPr>
    <pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr>
    <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
  return doc.importNode(
    new DOMParser().parseFromString(xml, "application/xml").documentElement,
    true,
  );
}

export function pageScale(page: HTMLElement) {
  return page.getBoundingClientRect().width / page.offsetWidth;
}

function findAnchor(preview: WordPreview, signature: WordSignature) {
  const page = preview.pages[signature.page];
  const scale = pageScale(page);
  const bounds = page.getBoundingClientRect();
  const x = bounds.left + signature.x * scale,
    y = bounds.top + signature.y * scale;
  let best: { index: number; x: number; y: number } | undefined;
  let distance = Infinity;
  for (const anchor of preview.anchors) {
    if (anchor.page !== page) continue;
    const rect = anchor.mark.getBoundingClientRect();
    const paragraph = anchor.mark.closest("p")?.getBoundingClientRect() ?? rect;
    // Prefer the paragraph in the target cell when adjacent cells share a line.
    const dx = Math.max(paragraph.left - x, 0, x - paragraph.right);
    const score = Math.hypot(dx, y - rect.top);
    if (score < distance) {
      distance = score;
      best = {
        index: anchor.index,
        x: (x - rect.left) / scale,
        y: (y - rect.top) / scale,
      };
    }
  }
  if (!best)
    throw new Error(
      "This page has no editable paragraph to anchor the signature. Move it to a page with document content.",
    );
  return best;
}

export async function exportWord(
  file: File,
  preview: WordPreview,
  signatures: WordSignature[],
) {
  const placements = signatures.map((signature) => ({
    signature,
    anchor: findAnchor(preview, signature),
  }));
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const mainPath = preview.mainPath;
  const dir = mainPath.slice(0, mainPath.lastIndexOf("/") + 1);
  const relPath = dir + "_rels/" + mainPath.slice(dir.length) + ".rels";
  const doc = await readXml(zip, mainPath),
    types = await readXml(zip, "[Content_Types].xml");
  const rels = zip.file(relPath)
    ? await readXml(zip, relPath)
    : document.implementation.createDocument(RELS, "Relationships");
  const locations = anchorLocations(doc);
  // Word requires drawing IDs to be unique across body, headers and other stories.
  const used = new Set<number>();
  for (const path of Object.keys(zip.files).filter(
    (path) => path.startsWith(dir) && /\.xml$/i.test(path),
  )) {
    const part = path === mainPath ? doc : await readXml(zip, path);
    for (const prop of part.getElementsByTagNameNS(WP, "docPr"))
      used.add(Number(prop.getAttribute("id")));
  }
  let id = 1;
  const images = new Map<string, string>();
  for (const { signature, anchor } of placements) {
    let relId = images.get(signature.url);
    if (!relId) {
      const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(signature.url);
      if (!match) throw new Error("Choose a PNG or JPEG signature image.");
      const token = crypto.randomUUID();
      const target = `media/signature-${token}.${match[1]}`;
      relId = "sig" + token;
      zip.file(dir + target, match[2], { base64: true });
      const rel = rels.createElementNS(RELS, "Relationship");
      rel.setAttribute("Id", relId);
      rel.setAttribute("Type", R + "/image");
      rel.setAttribute("Target", target);
      rels.documentElement.append(rel);
      const type = types.createElementNS(TYPES, "Override");
      type.setAttribute("PartName", "/" + dir + target);
      type.setAttribute("ContentType", "image/" + match[1]);
      types.documentElement.append(type);
      images.set(signature.url, relId);
    }
    while (used.has(id)) id++;
    insertAt(
      locations[anchor.index],
      drawing(doc, id++, relId, anchor.x, anchor.y, signature),
    );
  }
  zip.file(mainPath, serialize(doc));
  zip.file(relPath, serialize(rels));
  zip.file("[Content_Types].xml", serialize(types));
  return zip.generateAsync({
    type: "blob",
    mimeType: wordMime,
    compression: "DEFLATE",
  });
}
