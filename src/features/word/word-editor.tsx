"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Download, FilePlus2, Signature, Trash2 } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { SignatureDialog } from "@/features/signatures/signature-dialog";
import { documentAccept, validateEditorFile } from "@/features/pdf/session";
import {
  exportWord,
  pageScale,
  previewWord,
  type WordPreview,
  type WordSignature,
} from "./document";

const frameHtml = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src data: blob:; form-action 'none'; base-uri 'none'">
<style>
html, body { margin: 0; background: #f4f3f2; }
html { -webkit-text-size-adjust: none; text-size-adjust: none; }
#preview-space { position: relative; overflow: clip; }
#preview { position: absolute; top: 0; width: max-content; transform-origin: top left; }
#preview .docx-wrapper { padding: 16px 0; gap: 16px; background: transparent; }
#preview section.docx { flex: none; margin: 0; width: 8.5in; min-height: 11in; padding: 1in; }
#preview .placed-signature { position: absolute; z-index: 10; box-sizing: border-box; padding: 0; border: 0; background: transparent; touch-action: none; user-select: none; -webkit-user-drag: none; cursor: grab; }
#preview .placed-signature img { display: block; width: 100%; height: 100%; pointer-events: none; }
#preview .placed-signature[aria-pressed=true], #preview .placed-signature:focus-visible { outline: 2px dashed #ae3758; }
#preview .placed-signature:active { cursor: grabbing; }
#preview a { pointer-events: none; }
</style></head><body><div id="preview-space"><main id="preview"></main></div></body></html>`;

const clamp = (n: number, max: number) => Math.max(0, Math.min(n, max));

function fitMark(mark: WordSignature, page: HTMLElement): WordSignature {
  const scale = Math.min(
    1,
    page.offsetWidth / mark.width,
    page.offsetHeight / mark.height,
  );
  const width = mark.width * scale,
    height = mark.height * scale;
  return {
    ...mark,
    width,
    height,
    x: clamp(mark.x, page.offsetWidth - width),
    y: clamp(mark.y, page.offsetHeight - height),
  };
}

// The iframe viewport and pointer coordinates use screen pixels. Saved placements use
// unscaled CSS pixels on the document so resizing the browser preserves the location.
function closestPage(pages: HTMLElement[], y: number) {
  let best = 0,
    distance = Infinity;
  pages.forEach((page, i) => {
    const bounds = page.getBoundingClientRect();
    const gap = Math.max(bounds.top - y, 0, y - bounds.bottom);
    if (gap < distance) {
      best = i;
      distance = gap;
    }
  });
  return best;
}

export function WordEditor({
  file,
  onOpen,
}: {
  file: File;
  onOpen: (next: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [frame, setFrame] = useState<Document | null>(null);
  const [preview, setPreview] = useState<WordPreview | null>(null);
  const [marks, setMarks] = useState<WordSignature[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const stopDrag = useRef<(() => void) | null>(null);
  const active = marks.find((mark) => mark.id === selected);

  useEffect(() => {
    if (!frame) return;
    const container = frame.getElementById("preview")!;
    const space = container.parentElement!;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    const preventNavigation = (event: Event) => event.preventDefault();
    frame.addEventListener("click", preventNavigation);
    frame.addEventListener("dragstart", preventNavigation);
    previewWord(file, container)
      .then(async (result) => {
        if (cancelled) return;
        await frame.fonts.ready;
        if (cancelled) return;
        const fit = () => {
          // Lay out the full-size Word pages once. Scale the painted pages,
          // including their text and signatures, to the available width.
          const width = container.offsetWidth;
          if (!width || !space.clientWidth) return;
          const scale = Math.min(1, Math.max(1, space.clientWidth - 16) / width);
          container.style.transform = `scale(${scale})`;
          container.style.left = `${(space.clientWidth - width * scale) / 2}px`;
          space.style.height = `${Math.ceil(container.offsetHeight * scale)}px`;
        };
        fit();
        observer = new ResizeObserver(fit);
        observer.observe(container);
        observer.observe(space);
        setPreview(result);
      })
      .catch(() => {
        if (!cancelled)
          setLoadError(
            "Could not open this Word document. Choose an unencrypted .docx file.",
          );
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      stopDrag.current?.();
      frame.removeEventListener("click", preventNavigation);
      frame.removeEventListener("dragstart", preventNavigation);
    };
  }, [frame, file]);

  function open(next?: File) {
    if (!next) return;
    const issue = validateEditorFile(next);
    if (issue) setError(issue);
    else onOpen(next);
  }

  function update(next: WordSignature) {
    setMarks((previous) =>
      previous.map((mark) => (mark.id === next.id ? next : mark)),
    );
  }

  async function insert(url: string) {
    if (!preview || !frame?.defaultView) return;
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      const middle = frame.defaultView.innerHeight / 2;
      const number = closestPage(preview.pages, middle);
      const page = preview.pages[number],
        rect = page.getBoundingClientRect();
      const width = Math.min(
        180,
        (72 * image.naturalWidth) / image.naturalHeight,
      );
      const height = (width * image.naturalHeight) / image.naturalWidth;
      const mark = fitMark(
        {
          id: crypto.randomUUID(),
          url,
          page: number,
          width,
          height,
          x: (page.offsetWidth - width) / 2,
          y: (middle - rect.top) / pageScale(page) - height / 2,
        },
        page,
      );
      setMarks((previous) => [...previous, mark]);
      setSelected(mark.id);
      setError("");
    } catch {
      setError(
        "Could not read that signature image. Choose another PNG or JPEG.",
      );
    }
  }

  function drag(
    event: ReactPointerEvent<HTMLButtonElement>,
    mark: WordSignature,
  ) {
    if (!preview || !frame?.defaultView || busy || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    stopDrag.current?.();
    setSelected(mark.id);
    const view = frame.defaultView;
    const pages = preview.pages;
    const captureTarget = frame.body;
    const box = event.currentTarget.getBoundingClientRect();
    const grabX = (event.clientX - box.left) / box.width,
      grabY = (event.clientY - box.top) / box.height;
    const pointerId = event.pointerId;
    captureTarget.setPointerCapture(pointerId);
    let x = event.clientX,
      y = event.clientY,
      animation = 0;
    function position() {
      const number = closestPage(pages, y);
      const page = pages[number],
        rect = page.getBoundingClientRect(),
        scale = pageScale(page);
      update(
        fitMark(
          {
            ...mark,
            page: number,
            x: (x - rect.left) / scale - grabX * mark.width,
            y: (y - rect.top) / scale - grabY * mark.height,
          },
          page,
        ),
      );
    }
    function scroll() {
      animation = 0;
      const step = y < 40 ? -12 : y > view.innerHeight - 40 ? 12 : 0;
      if (!step) return;
      const before = view.scrollY;
      view.scrollBy(0, step);
      if (view.scrollY !== before) {
        position();
        animation = requestAnimationFrame(scroll);
      }
    }
    function move(e: PointerEvent) {
      if (e.pointerId !== pointerId) return;
      x = e.clientX;
      y = e.clientY;
      position();
      if (!animation) animation = requestAnimationFrame(scroll);
    }
    function finish(e: PointerEvent) {
      if (e.pointerId === pointerId) stop();
    }
    function stop() {
      cancelAnimationFrame(animation);
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerup", finish);
      view.removeEventListener("pointercancel", finish);
      view.removeEventListener("lostpointercapture", finish);
      if (captureTarget.hasPointerCapture(pointerId))
        captureTarget.releasePointerCapture(pointerId);
      stopDrag.current = null;
    }
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerup", finish);
    view.addEventListener("pointercancel", finish);
    view.addEventListener("lostpointercapture", finish);
    stopDrag.current = stop;
  }

  function remove(id: string) {
    setMarks((previous) => previous.filter((mark) => mark.id !== id));
    setSelected(null);
  }

  async function download() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const blob = await exportWord(file, preview, marks);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(/\.docx$/i, "") + "-signed.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(
        (e as Error).message || "Could not download this Word document.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editor-shell">
      <header className="editor-top">
        <div className="editor-top-left">
          <Brand compact />
          <span className="editor-divider" />
          <div className="file-title" title={file.name}>
            {file.name}
          </div>
          <input
            type="file"
            accept={documentAccept}
            ref={input}
            className="sr-only"
            aria-label="Open document"
            onChange={(e) => {
              open(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            className="icon-only"
            aria-label="Open another document"
            onClick={() => input.current?.click()}
          >
            <FilePlus2 size={17} />
          </button>
        </div>
        <Button
          size="sm"
          onClick={download}
          disabled={!marks.length}
          loading={busy}
          aria-label="Download signed Word document"
        >
          <Download size={16} /> Download
        </Button>
      </header>
      <div
        className="word-toolbar"
        role="toolbar"
        aria-label="Word signature tools"
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog(true)}
          disabled={!preview || busy}
        >
          <Signature size={17} /> Add signature
        </Button>
        {active && preview && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void insert(active.url)}
              disabled={busy}
            >
              Place again
            </Button>
            <label>
              Size{" "}
              <input
                type="range"
                aria-label="Signature size"
                min={Math.min(24, active.width)}
                max={Math.min(480, preview.pages[active.page].offsetWidth)}
                disabled={busy}
                value={active.width}
                onChange={(e) => {
                  const width = Number(e.target.value);
                  update(
                    fitMark(
                      {
                        ...active,
                        width,
                        height: (width * active.height) / active.width,
                      },
                      preview.pages[active.page],
                    ),
                  );
                }}
              />
            </label>
            <button
              className="icon-only"
              aria-label="Delete selected signature"
              disabled={busy}
              onClick={() => remove(active.id)}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
        {marks.length > 0 && (
          <span className="tool-hint">Drag your signature to a field</span>
        )}
      </div>
      {(error || loadError) && (
        <p className="editor-error" role="alert">
          {error || loadError}
        </p>
      )}
      {!preview && !loadError && (
        <p className="word-status" role="status">
          Opening Word document…
        </p>
      )}
      <iframe
        className="word-preview"
        title="Word document preview"
        sandbox="allow-same-origin"
        srcDoc={frameHtml}
        onLoad={(e) => setFrame(e.currentTarget.contentDocument)}
      />
      {preview &&
        marks.map((mark, index) =>
          createPortal(
            <button
              type="button"
              className="placed-signature"
              aria-label={`Signature ${index + 1}`}
              aria-pressed={selected === mark.id}
              disabled={busy}
              style={{
                left: mark.x,
                top: mark.y,
                width: mark.width,
                height: mark.height,
              }}
              onFocus={() => setSelected(mark.id)}
              onPointerDown={(e) => drag(e, mark)}
              onKeyDown={(e) => {
                if (e.key === "Delete" || e.key === "Backspace") {
                  e.preventDefault();
                  remove(mark.id);
                  return;
                }
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
                if (dx || dy) {
                  e.preventDefault();
                  update(
                    fitMark(
                      { ...mark, x: mark.x + dx, y: mark.y + dy },
                      preview.pages[mark.page],
                    ),
                  );
                }
              }}
            >
              <img src={mark.url} alt="" draggable={false} />
            </button>,
            preview.pages[mark.page],
            mark.id,
          ),
        )}
      <SignatureDialog
        open={dialog}
        onOpenChange={setDialog}
        onInsert={insert}
      />
    </div>
  );
}
