import type { Annotation } from "./types";
import { rectFromPdf, viewportRectToPdf, type ViewportLike } from "@/features/pdf/coordinates";

export type ScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
export type Guides = { vertical: number | null; horizontal: number | null };

const snapDistance = 6;

export function clampScreenRect(rect: ScreenRect, pageWidth: number, pageHeight: number): ScreenRect {
  const width = Math.min(Math.max(12, rect.width), pageWidth);
  const height = Math.min(Math.max(12, rect.height), pageHeight);
  return {
    left: Math.max(0, Math.min(rect.left, pageWidth - width)),
    top: Math.max(0, Math.min(rect.top, pageHeight - height)),
    width,
    height,
  };
}

export function resizeScreenRect(
  start: ScreenRect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  pageWidth: number,
  pageHeight: number,
  proportional: boolean,
): ScreenRect {
  const east = handle.includes("e");
  const west = handle.includes("w");
  const north = handle.includes("n");
  const south = handle.includes("s");
  let left = west ? start.left + dx : start.left;
  let top = north ? start.top + dy : start.top;
  let right = east ? start.left + start.width + dx : start.left + start.width;
  let bottom = south ? start.top + start.height + dy : start.top + start.height;
  const minimum = Math.min(24, pageWidth, pageHeight);
  const ratio = start.width / start.height;
  if (right - left < minimum) {
    if (west) left = right - minimum;
    else right = left + minimum;
  }
  if (bottom - top < minimum) {
    if (north) top = bottom - minimum;
    else bottom = top + minimum;
  }
  if (proportional) {
    const widthChange = Math.abs((right - left) / start.width - 1);
    const heightChange = Math.abs((bottom - top) / start.height - 1);
    if (widthChange >= heightChange) {
      const h = (right - left) / ratio;
      if (north) top = bottom - h;
      else bottom = top + h;
    } else {
      const w = (bottom - top) * ratio;
      if (west) left = right - w;
      else right = left + w;
    }
  }
  if (left < 0) {
    if (west) left = 0;
    else { right -= left; left = 0; }
  }
  if (top < 0) {
    if (north) top = 0;
    else { bottom -= top; top = 0; }
  }
  if (right > pageWidth) {
    if (east) right = pageWidth;
    else { left -= right - pageWidth; right = pageWidth; }
  }
  if (bottom > pageHeight) {
    if (south) bottom = pageHeight;
    else { top -= bottom - pageHeight; bottom = pageHeight; }
  }
  if (proportional) {
    const w = right - left, h = bottom - top;
    const fittedW = Math.min(w, h * ratio);
    const fittedH = fittedW / ratio;
    if (west) left = right - fittedW;
    else right = left + fittedW;
    if (north) top = bottom - fittedH;
    else bottom = top + fittedH;
  }
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

export function snapScreenRect(
  rect: ScreenRect,
  viewport: ViewportLike,
  others: Annotation[],
  page: number,
  excludedId: string,
): { rect: ScreenRect; guides: Guides } {
  const vertical = [0, viewport.width / 2, viewport.width];
  const horizontal = [0, viewport.height / 2, viewport.height];
  for (const other of others) {
    if (other.page !== page || other.id === excludedId) continue;
    const r = rectFromPdf(viewport, other);
    vertical.push(r.left, r.left + r.width / 2, r.left + r.width);
    horizontal.push(r.top, r.top + r.height / 2, r.top + r.height);
  }
  const xAnchors = [rect.left, rect.left + rect.width / 2, rect.left + rect.width];
  const yAnchors = [rect.top, rect.top + rect.height / 2, rect.top + rect.height];
  let xDelta = 0, yDelta = 0;
  let xGuide: number | null = null, yGuide: number | null = null;
  let bestX = snapDistance + 1, bestY = snapDistance + 1;
  for (const target of vertical) for (const anchor of xAnchors) {
    const distance = Math.abs(target - anchor);
    if (distance < bestX) { bestX = distance; xDelta = target - anchor; xGuide = target; }
  }
  for (const target of horizontal) for (const anchor of yAnchors) {
    const distance = Math.abs(target - anchor);
    if (distance < bestY) { bestY = distance; yDelta = target - anchor; yGuide = target; }
  }
  const next = clampScreenRect(
    { ...rect, left: rect.left + (bestX <= snapDistance ? xDelta : 0), top: rect.top + (bestY <= snapDistance ? yDelta : 0) },
    viewport.width,
    viewport.height,
  );
  return {
    rect: next,
    guides: {
      vertical: bestX <= snapDistance ? xGuide : null,
      horizontal: bestY <= snapDistance ? yGuide : null,
    },
  };
}

export function annotationGeometryPatch(
  annotation: Annotation,
  viewport: ViewportLike,
  nextRect: ScreenRect,
): Partial<Annotation> {
  const next = viewportRectToPdf(
    viewport, nextRect.left, nextRect.top, nextRect.width, nextRect.height,
  );
  if (annotation.kind !== "draw") return next;
  const sx = annotation.width ? next.width / annotation.width : 1;
  const sy = annotation.height ? next.height / annotation.height : 1;
  return {
    ...next,
    points: annotation.points.map((p) => ({
      x: next.x + (p.x - annotation.x) * sx,
      y: next.y + (p.y - annotation.y) * sy,
    })),
  };
}
