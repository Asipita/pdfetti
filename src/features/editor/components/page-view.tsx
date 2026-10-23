"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { Grip, X } from "lucide-react";
import { useEditor } from "../store/use-editor";
import type { Annotation } from "../types";
import {
  pdfToViewport,
  rectFromPdf,
  viewportRectToPdf,
  viewportToPdf,
  type ViewportLike,
} from "@/features/pdf/coordinates";
type Widget = {
  id: string;
  fieldName: string;
  fieldType: string;
  rect: number[];
  fieldValue?: string | boolean;
  buttonValue?: string;
  options?: { displayValue: string; exportValue: string }[];
  checkBox?: boolean;
  radioButton?: boolean;
};
export function PageView({
  pdf,
  pageNumber,
  zoom,
  availableWidth,
  onVisible,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  availableWidth: number;
  onVisible: (page: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber === 1),
    [page, setPage] = useState<PDFPageProxy | null>(null),
    [widgets, setWidgets] = useState<Widget[]>([]),
    [view, setView] = useState<ViewportLike | null>(null);
  const tool = useEditor((s) => s.tool),
    add = useEditor((s) => s.add),
    select = useEditor((s) => s.select),
    setPageNumber = useEditor((s) => s.setPage),
    signature = useEditor((s) => s.signature);
  const annotations = useEditor((s) => s.annotations);
  const ann = annotations.filter((a) => a.page === pageNumber);
  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          onVisible(pageNumber);
        }
      },
      { rootMargin: "700px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [pageNumber, onVisible]);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    pdf.getPage(pageNumber).then(async (p) => {
      if (cancelled) return;
      setPage(p);
      const items = await p.getAnnotations({ intent: "display" });
      if (!cancelled)
        setWidgets(
          items
            .filter((i) => i.subtype === "Widget")
            .map((i) => i as unknown as Widget),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, visible]);
  useEffect(() => {
    if (!page || !visible || !canvas.current) return;
    const base = page.getViewport({ scale: 1 });
    const scale =
      Math.min(1.28, Math.max(0.3, (availableWidth - 32) / base.width)) * zoom;
    const viewport = page.getViewport({ scale });
    setView(viewport);
    const c = canvas.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.floor(viewport.width * dpr);
    c.height = Math.floor(viewport.height * dpr);
    c.style.width = `${viewport.width}px`;
    c.style.height = `${viewport.height}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const task = page.render({
      canvasContext: ctx,
      canvas: c,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    });
    task.promise.catch(() => {});
    return () => task.cancel();
  }, [page, zoom, availableWidth, visible]);
  const width = view?.width || Math.min(availableWidth - 32, 700),
    height = view?.height || width * 1.3;
  function createAt(e: React.PointerEvent<HTMLDivElement>) {
    if (!view) return;
    if (tool === "select") {
      if (!(e.target as HTMLElement).closest("[data-annotation],[data-widget]"))
        select(null);
      return;
    }
    if (
      tool === "draw" ||
      (e.target as HTMLElement).closest("[data-annotation],[data-widget]")
    )
      return;
    const box = e.currentTarget.getBoundingClientRect();
    const left = e.clientX - box.left,
      top = e.clientY - box.top;
    const p = viewportToPdf(view, { x: left, y: top });
    const r = viewportRectToPdf(
      view,
      left,
      top,
      tool === "signature" ? 190 : tool === "check" ? 34 : 220,
      tool === "signature" ? 80 : tool === "check" ? 34 : 52,
    );
    const id = crypto.randomUUID();
    if (tool === "signature") {
      if (!signature) {
        window.dispatchEvent(new CustomEvent("pdfetti:signature"));
        return;
      }
      add({
        kind: "signature",
        id,
        page: pageNumber,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        dataUrl: signature,
      });
    } else if (tool === "check")
      add({
        kind: "check",
        id,
        page: pageNumber,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        color: "#271f22",
      });
    else
      add({
        kind: "text",
        id,
        page: pageNumber,
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        text: "",
        fontSize: 16,
        color: "#271f22",
      });
    setPageNumber(pageNumber);
  }
  return (
    <section
      ref={holder}
      id={`pdf-page-${pageNumber}`}
      className="page-section"
      aria-label={`Page ${pageNumber}`}
    >
      <div className="page-label">Page {pageNumber}</div>
      <div
        className={`pdf-page ${tool !== "select" ? "pdf-page--placing" : ""}`}
        style={{ width, height }}
        onPointerDown={createAt}
      >
        <canvas ref={canvas} aria-hidden="true" />
        {view && (
          <>
            <div className="page-overlay">
              {widgets.map((w) => (
                <WidgetField key={w.id} widget={w} viewport={view} />
              ))}
            </div>
            <div className="page-overlay">
              {ann.map((a) => (
                <AnnotationView key={a.id} annotation={a} viewport={view} />
              ))}
            </div>
            {tool === "draw" && (
              <DrawingLayer pageNumber={pageNumber} viewport={view} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
function WidgetField({
  widget: w,
  viewport,
}: {
  widget: Widget;
  viewport: ViewportLike;
}) {
  const key = w.fieldName;
  const value = useEditor((s) => s.forms[key]);
  const setForm = useEditor((s) => s.setForm);
  const [x1, y1, x2, y2] = w.rect;
  const rect = rectFromPdf(viewport, {
    x: x1,
    y: y2,
    width: x2 - x1,
    height: y2 - y1,
  });
  const style = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
  if (!key) return null;
  if (w.fieldType === "Tx")
    return (
      <input
        data-widget
        aria-label={key}
        className="pdf-field"
        style={style}
        value={typeof value === "string" ? value : String(w.fieldValue || "")}
        onChange={(e) => setForm(key, e.target.value)}
      />
    );
  if (w.fieldType === "Btn" && w.checkBox)
    return (
      <label data-widget className="pdf-checkbox" style={style}>
        <input
          aria-label={key}
          type="checkbox"
          checked={
            typeof value === "boolean"
              ? value
              : Boolean(w.fieldValue && w.fieldValue !== "Off")
          }
          onChange={(e) => setForm(key, e.target.checked)}
        />
      </label>
    );
  if (w.fieldType === "Btn" && w.radioButton)
    return (
      <label data-widget className="pdf-checkbox" style={style}>
        <input
          aria-label={`${key}: ${w.buttonValue || w.id}`}
          type="radio"
          name={key}
          value={w.buttonValue}
          checked={
            typeof value === "string"
              ? value === w.buttonValue
              : w.fieldValue === w.buttonValue
          }
          onChange={() => setForm(key, w.buttonValue || "")}
        />
      </label>
    );
  if (w.fieldType === "Ch")
    return (
      <select
        data-widget
        aria-label={key}
        className="pdf-field"
        style={style}
        value={typeof value === "string" ? value : String(w.fieldValue || "")}
        onChange={(e) => setForm(key, e.target.value)}
      >
        <option value="">Select</option>
        {(w.options || []).map((o) => (
          <option key={o.exportValue} value={o.exportValue}>
            {o.displayValue}
          </option>
        ))}
      </select>
    );
  return null;
}
function AnnotationView({
  annotation: a,
  viewport,
}: {
  annotation: Annotation;
  viewport: ViewportLike;
}) {
  const selected = useEditor((s) => s.selectedId === a.id),
    select = useEditor((s) => s.select),
    update = useEditor((s) => s.update),
    remove = useEditor((s) => s.remove);
  const rect = rectFromPdf(viewport, a);
  const [draft, setDraft] = useState(a.kind === "text" ? a.text : "");
  useEffect(() => {
    if (a.kind === "text") setDraft(a.text);
  }, [a]);
  const interaction = useRef<{
    type: "move" | "resize";
    startX: number;
    startY: number;
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const element = useRef<HTMLDivElement>(null);
  function start(e: React.PointerEvent, type: "move" | "resize") {
    e.stopPropagation();
    select(a.id);
    interaction.current = { type, startX: e.clientX, startY: e.clientY, rect };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function end(e: React.PointerEvent) {
    const d = interaction.current;
    if (!d) return;
    interaction.current = null;
    const dx = e.clientX - d.startX,
      dy = e.clientY - d.startY;
    const r =
      d.type === "move"
        ? {
            left: d.rect.left + dx,
            top: d.rect.top + dy,
            width: d.rect.width,
            height: d.rect.height,
          }
        : {
            left: d.rect.left,
            top: d.rect.top,
            width: Math.max(28, d.rect.width + dx),
            height: Math.max(22, d.rect.height + dy),
          };
    update(a.id, viewportRectToPdf(viewport, r.left, r.top, r.width, r.height));
  }
  function moving(e: React.PointerEvent) {
    const d = interaction.current;
    if (!d || !element.current) return;
    const dx = e.clientX - d.startX,
      dy = e.clientY - d.startY;
    Object.assign(
      element.current.style,
      d.type === "move"
        ? { left: `${d.rect.left + dx}px`, top: `${d.rect.top + dy}px` }
        : {
            width: `${Math.max(28, d.rect.width + dx)}px`,
            height: `${Math.max(22, d.rect.height + dy)}px`,
          },
    );
  }
  return (
    <div
      ref={element}
      data-annotation
      className={`annotation annotation--${a.kind} ${selected ? "annotation--selected" : ""}`}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        select(a.id);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {a.kind === "text" ? (
        <textarea
          autoFocus={selected && a.text === ""}
          value={draft}
          placeholder="Type here"
          aria-label="Text annotation"
          style={{ fontSize: a.fontSize * viewport.scale, color: a.color }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== a.text) update(a.id, { text: draft });
          }}
        />
      ) : a.kind === "signature" ? (
        <img src={a.dataUrl} alt="Signature" draggable={false} />
      ) : a.kind === "check" ? (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-label="Checkmark"
        >
          <path
            d="M14 51 L39 75 L87 20"
            fill="none"
            stroke={a.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox={`0 0 ${rect.width} ${rect.height}`} aria-label="Drawing">
          {a.points.length > 1 && (
            <polyline
              points={a.points
                .map((p) => {
                  const v = pdfToViewport(viewport, p);
                  return `${v.x - rect.left},${v.y - rect.top}`;
                })
                .join(" ")}
              fill="none"
              stroke={a.color}
              strokeWidth={a.strokeWidth * viewport.scale}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      )}
      {selected && (
        <>
          <div
            className="annotation-move"
            role="button"
            tabIndex={0}
            aria-label="Move annotation"
            onPointerDown={(e) => start(e, "move")}
            onPointerMove={moving}
            onPointerUp={end}
            onKeyDown={(e) => {
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx =
                  e.key === "ArrowLeft"
                    ? -step
                    : e.key === "ArrowRight"
                      ? step
                      : 0;
                const dy =
                  e.key === "ArrowUp"
                    ? -step
                    : e.key === "ArrowDown"
                      ? step
                      : 0;
                update(
                  a.id,
                  viewportRectToPdf(
                    viewport,
                    rect.left + dx,
                    rect.top + dy,
                    rect.width,
                    rect.height,
                  ),
                );
              }
            }}
          >
            <Grip size={14} />
          </div>
          <button
            className="annotation-delete"
            aria-label="Delete annotation"
            onClick={(e) => {
              e.stopPropagation();
              remove(a.id);
            }}
          >
            <X size={13} />
          </button>
          <div
            className="annotation-resize"
            role="button"
            tabIndex={0}
            aria-label="Resize annotation"
            onPointerDown={(e) => start(e, "resize")}
            onPointerMove={moving}
            onPointerUp={end}
            onKeyDown={(e) => {
              if (
                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx =
                  e.key === "ArrowLeft"
                    ? -step
                    : e.key === "ArrowRight"
                      ? step
                      : 0;
                const dy =
                  e.key === "ArrowUp"
                    ? -step
                    : e.key === "ArrowDown"
                      ? step
                      : 0;
                update(
                  a.id,
                  viewportRectToPdf(
                    viewport,
                    rect.left,
                    rect.top,
                    Math.max(28, rect.width + dx),
                    Math.max(22, rect.height + dy),
                  ),
                );
              }
            }}
          />
        </>
      )}
    </div>
  );
}
function DrawingLayer({
  pageNumber,
  viewport,
}: {
  pageNumber: number;
  viewport: ViewportLike;
}) {
  const add = useEditor((s) => s.add);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const drawing = useRef(false);
  const getPoint = (e: React.PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return viewportToPdf(viewport, {
      x: e.clientX - b.left,
      y: e.clientY - b.top,
    });
  };
  function start(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    setPoints([getPoint(e)]);
  }
  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (drawing.current) setPoints((p) => [...p, getPoint(e)]);
  }
  function end() {
    if (points.length > 1) {
      const xs = points.map((p) => p.x),
        ys = points.map((p) => p.y);
      add({
        id: crypto.randomUUID(),
        kind: "draw",
        page: pageNumber,
        x: Math.min(...xs),
        y: Math.max(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points,
        color: "#271f22",
        strokeWidth: 2,
      });
    }
    drawing.current = false;
    setPoints([]);
  }
  return (
    <div
      className="draw-layer"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
    >
      <svg width="100%" height="100%">
        {points.length > 1 && (
          <polyline
            points={points
              .map((p) => {
                const v = pdfToViewport(viewport, p);
                return `${v.x},${v.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#271f22"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}
export function PageThumbnail({
  pdf,
  pageNumber,
  active,
  onClick,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: ReturnType<PDFPageProxy["render"]> | null = null;
    pdf.getPage(pageNumber).then((page) => {
      if (!canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 120 / base.width });
      const c = canvas.current;
      c.width = vp.width;
      c.height = vp.height;
      const ctx = c.getContext("2d");
      if (ctx) {
        task = page.render({ canvas: c, canvasContext: ctx, viewport: vp });
        task.promise.catch(() => {});
      }
    });
    return () => task?.cancel();
  }, [pdf, pageNumber]);
  return (
    <button
      className={`page-thumbnail ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={active ? "page" : undefined}
    >
      <canvas ref={canvas} />
      <span>{pageNumber}</span>
    </button>
  );
}
