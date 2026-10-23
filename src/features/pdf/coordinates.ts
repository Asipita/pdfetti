export type Point = { x: number; y: number };
export type ViewportLike = {
  convertToPdfPoint: (x: number, y: number) => number[];
  convertToViewportPoint: (x: number, y: number) => number[];
  scale: number;
  width: number;
  height: number;
};
export function viewportToPdf(viewport: ViewportLike, p: Point): Point {
  const [x, y] = viewport.convertToPdfPoint(p.x, p.y);
  return { x, y };
}
export function pdfToViewport(viewport: ViewportLike, p: Point): Point {
  const [x, y] = viewport.convertToViewportPoint(p.x, p.y);
  return { x, y };
}
export function rectFromPdf(
  viewport: ViewportLike,
  a: { x: number; y: number; width: number; height: number },
) {
  const corners = [
    [a.x, a.y],
    [a.x + a.width, a.y],
    [a.x, a.y - a.height],
    [a.x + a.width, a.y - a.height],
  ].map(([x, y]) => viewport.convertToViewportPoint(x, y));
  const xs = corners.map((v) => v[0]),
    ys = corners.map((v) => v[1]);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
export function viewportRectToPdf(
  viewport: ViewportLike,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const corners = [
    [left, top],
    [left + width, top],
    [left, top + height],
    [left + width, top + height],
  ].map(([x, y]) => viewport.convertToPdfPoint(x, y));
  const xs = corners.map((v) => v[0]),
    ys = corners.map((v) => v[1]);
  return {
    x: Math.min(...xs),
    y: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
