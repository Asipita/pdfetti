import type { ViewportLike } from "@/features/pdf/coordinates";

const viewports = new Map<number, ViewportLike>();

export function registerViewport(page: number, viewport: ViewportLike) {
  viewports.set(page, viewport);
}

export function getPageViewport(page: number): ViewportLike | undefined {
  return viewports.get(page);
}

export function clearPageViewport(page: number) {
  viewports.delete(page);
}
