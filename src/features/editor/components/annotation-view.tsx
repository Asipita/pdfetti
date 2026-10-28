"use client";
import { useEffect, useRef, useState } from "react";
import { Grip, X } from "lucide-react";
import { useEditor } from "../store/use-editor";
import type { Annotation } from "../types";
import {
  annotationGeometryPatch,
  clampScreenRect,
  resizeScreenRect,
  snapScreenRect,
  type Guides,
  type ResizeHandle,
  type ScreenRect,
} from "../geometry";
import {
  pdfToViewport,
  rectFromPdf,
  viewportRectToPdf,
  type ViewportLike,
} from "@/features/pdf/coordinates";
import { fontStyle, getDocumentFont, resolveTextFormatting } from "@/features/fonts/registry";
import { layoutText, requiredTextHeight } from "@/features/fonts/text-layout";

type Interaction = {
  pointerId: number;
  target: HTMLElement;
  type: "move" | "resize";
  handle?: ResizeHandle;
  startX: number;
  startY: number;
  startRect: ScreenRect;
  latestRect: ScreenRect;
  moved: boolean;
};

export function AnnotationView({
  annotation: a,
  viewport,
  others,
  onGuides,
}: {
  annotation: Annotation;
  viewport: ViewportLike;
  others: Annotation[];
  onGuides: (guides: Guides) => void;
}) {
  const selected = useEditor((s) => s.selectedId === a.id);
  const editing = useEditor((s) => s.editingId === a.id);
  const select = useEditor((s) => s.select);
  const setEditing = useEditor((s) => s.setEditing);
  const update = useEditor((s) => s.update);
  const remove = useEditor((s) => s.remove);
  const rect = rectFromPdf(viewport, a);
  const format = a.kind === "text" ? resolveTextFormatting(a) : null;
  const family = format ? getDocumentFont(format.fontId) : null;
  const variant = format && family ? fontStyle(family, format) : null;
  const [draft, setDraft] = useState(a.kind === "text" ? a.text : "");
  const element = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const animation = useRef<number | null>(null);
  const expandedHeight = useRef<number>(0);
  const measureCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (a.kind === "text" && !editing) setDraft(a.text);
  }, [a, editing]);
  useEffect(() => {
    if (!editing || !textarea.current) return;
    textarea.current.focus();
    textarea.current.setSelectionRange(
      textarea.current.value.length,
      textarea.current.value.length,
    );
  }, [editing]);
  useEffect(() => {
    if (!editing || !textarea.current || !element.current) return;
    const needed = textarea.current.scrollHeight + 2;
    if (needed > rect.height) {
      expandedHeight.current = Math.min(viewport.height - rect.top, needed);
      element.current.style.height = `${expandedHeight.current}px`;
    }
  }, [draft, editing, rect.height, rect.top, viewport.height]);
  useEffect(() => () => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    onGuides({ vertical: null, horizontal: null });
  }, [onGuides]);

  function setVisual(next: ScreenRect) {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = requestAnimationFrame(() => {
      if (!element.current) return;
      Object.assign(element.current.style, {
        left: `${next.left}px`,
        top: `${next.top}px`,
        width: `${next.width}px`,
        height: `${next.height}px`,
      });
    });
  }
  function resetVisual() {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
    if (!element.current) return;
    Object.assign(element.current.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
  function begin(e: React.PointerEvent<HTMLElement>, type: "move" | "resize", handle?: ResizeHandle) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    if (editing) return;
    select(a.id);
    interaction.current = {
      pointerId: e.pointerId,
      target: e.currentTarget,
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startRect: rect,
      latestRect: rect,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function calculate(e: React.PointerEvent<HTMLElement>, current: Interaction) {
    const dx = e.clientX - current.startX;
    const dy = e.clientY - current.startY;
    const moved = Math.hypot(dx, dy) >= 3;
    if (!moved && !current.moved) return current.startRect;
    current.moved = true;
    if (current.type === "resize") {
      onGuides({ vertical: null, horizontal: null });
      const next = resizeScreenRect(
        current.startRect,
        current.handle || "se",
        dx, dy, viewport.width, viewport.height,
        a.kind !== "text",
      );
      if (a.kind === "text" && format && family) {
        if (!measureCanvas.current) measureCanvas.current = document.createElement("canvas");
        const ctx = measureCanvas.current.getContext("2d");
        if (ctx) {
          const size = format.fontSize * viewport.scale;
          ctx.font = `${variant === "italic" || variant === "boldItalic" ? "italic " : ""}${variant === "bold" || variant === "boldItalic" ? "700 " : "400 "}${size}px "${family.cssFamily}"`;
          const lines = layoutText(a.text, Math.max(1, next.width - 2), (text) => ctx.measureText(text).width);
          const needed = requiredTextHeight(lines.length, size, format.lineHeight);
          if (needed > next.height) {
            const available = viewport.height - next.top;
            const target = Math.min(needed, available);
            if (current.handle?.includes("n") && !current.handle.includes("s")) {
              next.top = Math.max(0, next.top - (target - next.height));
            }
            next.height = Math.min(target, viewport.height - next.top);
          }
        }
      }
      return next;
    }
    const unsnapped = clampScreenRect(
      { ...current.startRect, left: current.startRect.left + dx, top: current.startRect.top + dy },
      viewport.width, viewport.height,
    );
    if (e.shiftKey) {
      onGuides({ vertical: null, horizontal: null });
      return unsnapped;
    }
    const snapped = snapScreenRect(unsnapped, viewport, others, a.page, a.id);
    onGuides(snapped.guides);
    return snapped.rect;
  }
  function move(e: React.PointerEvent<HTMLElement>) {
    const current = interaction.current;
    if (!current || current.pointerId !== e.pointerId) return;
    current.latestRect = calculate(e, current);
    if (current.moved) setVisual(current.latestRect);
  }
  function finish(e: React.PointerEvent<HTMLElement>) {
    const current = interaction.current;
    if (!current || current.pointerId !== e.pointerId) return;
    current.latestRect = calculate(e, current);
    interaction.current = null;
    onGuides({ vertical: null, horizontal: null });
    if (animation.current !== null) {
      cancelAnimationFrame(animation.current);
      animation.current = null;
    }
    if (!current.moved) {
      resetVisual();
      return;
    }
    if (element.current)
      Object.assign(element.current.style, {
        left: `${current.latestRect.left}px`,
        top: `${current.latestRect.top}px`,
        width: `${current.latestRect.width}px`,
        height: `${current.latestRect.height}px`,
      });
    const patch = annotationGeometryPatch(a, viewport, current.latestRect);
    update(a.id, patch);
  }
  function cancel(e: React.PointerEvent<HTMLElement>) {
    const current = interaction.current;
    if (current?.pointerId !== e.pointerId) return;
    interaction.current = null;
    if (current.target.hasPointerCapture(e.pointerId))
      current.target.releasePointerCapture(e.pointerId);
    onGuides({ vertical: null, horizontal: null });
    resetVisual();
  }
  function commitText() {
    if (a.kind !== "text") return;
    const patch: Partial<Annotation> = { text: draft };
    if (expandedHeight.current > rect.height) {
      Object.assign(
        patch,
        viewportRectToPdf(
          viewport, rect.left, rect.top, rect.width, expandedHeight.current,
        ),
      );
    }
    expandedHeight.current = 0;
    update(a.id, patch);
    setEditing(null);
  }
  const handles: ResizeHandle[] =
    a.kind === "text"
      ? ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
      : ["nw", "ne", "se", "sw"];
  return (
    <div
      ref={element}
      data-annotation
      data-annotation-id={a.id}
      data-editing={editing}
      className={`annotation annotation--${a.kind} ${selected ? "annotation--selected" : ""} ${editing ? "annotation--editing" : ""}`}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      onPointerDown={(e) => begin(e, "move")}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={cancel}
      onLostPointerCapture={(e) => {
        if (interaction.current?.pointerId === e.pointerId) cancel(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (a.kind === "text") setEditing(a.id);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {a.kind === "text" ? (
        <textarea
          ref={textarea}
          value={draft}
          readOnly={!editing}
          tabIndex={editing ? 0 : -1}
          placeholder={editing ? "Type here" : ""}
          aria-label="Text annotation"
          style={{
            fontFamily: `"${family!.cssFamily}"`,
            fontSize: format!.fontSize * viewport.scale,
            fontWeight: variant === "bold" || variant === "boldItalic" ? 700 : 400,
            fontStyle: variant === "italic" || variant === "boldItalic" ? "italic" : "normal",
            lineHeight: format!.lineHeight,
            textAlign: format!.align,
            color: format!.color,
            pointerEvents: editing ? "auto" : "none",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur();
            }
          }}
        />
      ) : a.kind === "signature" ? (
        <img src={a.dataUrl} alt="Signature" draggable={false} />
      ) : a.kind === "check" ? (
        <svg viewBox="0 0 100 100" aria-label="Checkmark">
          <path d="M14 51 L39 75 L87 20" fill="none" stroke={a.color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox={`0 0 ${rect.width} ${rect.height}`} aria-label="Drawing">
          {a.points.length > 1 && (
            <polyline
              points={a.points.map((p) => {
                const v = pdfToViewport(viewport, p);
                return `${v.x - rect.left},${v.y - rect.top}`;
              }).join(" ")}
              fill="none" stroke={a.color}
              strokeWidth={a.strokeWidth * viewport.scale}
              strokeLinecap="round" strokeLinejoin="round"
            />
          )}
        </svg>
      )}
      {selected && !editing && (
        <>
          <div
            className="annotation-move"
            role="button" tabIndex={0} aria-label="Move annotation"
            onPointerDown={(e) => begin(e, "move")}
          >
            <Grip size={12} aria-hidden="true" />
          </div>
          <button
            type="button" className="annotation-delete"
            aria-label="Delete annotation"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); remove(a.id); }}
          >
            <X size={12} />
          </button>
          {handles.map((handle) => (
            <div
              key={handle}
              className={`annotation-resize annotation-resize--${handle}`}
              role="button" tabIndex={0}
              aria-label={handle === "se" ? "Resize annotation" : `Resize annotation ${handle}`}
              onPointerDown={(e) => begin(e, "resize", handle)}
            />
          ))}
        </>
      )}
    </div>
  );
}
