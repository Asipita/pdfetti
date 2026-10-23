"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  Menu,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  Redo2,
  Signature,
  Type,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { validateFile, takePendingFile } from "@/features/pdf/session";
import { loadPdf } from "@/features/pdf/loader";

import { useEditor } from "../store/use-editor";
import type { Tool } from "../types";
import { PageView, PageThumbnail } from "./page-view";
import { SignatureDialog } from "@/features/signatures/signature-dialog";
const tools: { id: Tool; label: string; Icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", Icon: MousePointer2 },
  { id: "text", label: "Text", Icon: Type },
  { id: "signature", label: "Sign", Icon: Signature },
  { id: "check", label: "Check", Icon: Check },
  { id: "draw", label: "Draw", Icon: PenLine },
];
export function Editor() {
  const input = useRef<HTMLInputElement>(null),
    workspace = useRef<HTMLDivElement>(null),
    pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [loading, setLoading] = useState(false),
    [mobilePages, setMobilePages] = useState(false),
    [sidebar, setSidebar] = useState(true),
    [signOpen, setSignOpen] = useState(false),
    [availableWidth, setAvailableWidth] = useState(850),
    [success, setSuccess] = useState(false);
  const file = useEditor((s) => s.file),
    bytes = useEditor((s) => s.bytes),
    pageCount = useEditor((s) => s.pageCount),
    currentPage = useEditor((s) => s.currentPage),
    zoom = useEditor((s) => s.zoom),
    tool = useEditor((s) => s.tool),
    annotations = useEditor((s) => s.annotations),
    forms = useEditor((s) => s.forms),
    past = useEditor((s) => s.past),
    future = useEditor((s) => s.future),
    selectedId = useEditor((s) => s.selectedId),
    exporting = useEditor((s) => s.exporting),
    error = useEditor((s) => s.error),
    signature = useEditor((s) => s.signature);
  const state = useEditor;
  const selected = annotations.find((a) => a.id === selectedId);
  const openFile = useCallback(
    async (next: File) => {
      const issue = validateFile(next);
      if (issue) {
        state.getState().setError(issue);
        return;
      }
      setLoading(true);
      state.getState().setError(null);
      try {
        const buffer = new Uint8Array(await next.arrayBuffer());
        if (
          buffer[0] !== 37 ||
          buffer[1] !== 80 ||
          buffer[2] !== 68 ||
          buffer[3] !== 70
        )
          throw new Error("This does not appear to be a valid PDF.");
        let doc: PDFDocumentProxy;
        try {
          doc = await loadPdf(buffer);
        } catch (e) {
          const ex = e as Error;
          if (ex.name === "PasswordException") {
            const password = window.prompt(
              "This PDF is password protected. Enter its password:",
            );
            if (!password)
              throw new Error("A password is required to open this PDF.");
            doc = await loadPdf(buffer, password);
          } else throw e;
        }
        if (doc.isPureXfa)
          throw new Error(
            "This PDF uses XFA forms, which PDFetti cannot safely edit yet.",
          );
        await pdfRef.current?.destroy();
        pdfRef.current = doc;
        setPdf(doc);
        state.getState().setDocument(next, buffer, doc.numPages);
        setMobilePages(false);
        workspace.current?.scrollTo({ top: 0 });
      } catch (e) {
        state
          .getState()
          .setError((e as Error).message || "Could not open this PDF.");
      } finally {
        setLoading(false);
      }
    },
    [state],
  );
  useEffect(() => {
    takePendingFile()
      .then((f) => {
        if (f) void openFile(f);
      })
      .catch(() => {});
    return () => {
      void pdfRef.current?.destroy();
    };
  }, [openFile]);
  useEffect(() => {
    const node = workspace.current;
    if (!node) return;
    const ro = new ResizeObserver(() =>
      setAvailableWidth(
        Math.max(
          320,
          node.clientWidth -
            (window.innerWidth <= 650 ? 16 : sidebar ? 240 : 50),
        ),
      ),
    );
    ro.observe(node);
    setAvailableWidth(
      Math.max(
        320,
        node.clientWidth - (window.innerWidth <= 650 ? 16 : sidebar ? 240 : 50),
      ),
    );
    return () => ro.disconnect();
  }, [sidebar, pdf]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,[contenteditable]")) return;
      const s = state.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        s.selectedId
      ) {
        e.preventDefault();
        s.remove(s.selectedId);
      } else if (e.key === "Escape") {
        s.select(null);
        s.setTool("select");
      }
    }
    window.addEventListener("keydown", onKey);
    const sign = () => setSignOpen(true);
    window.addEventListener("pdfetti:signature", sign);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pdfetti:signature", sign);
    };
  }, [state]);
  const onVisible = useCallback(
    (n: number) => {
      const s = state.getState();
      if (s.currentPage !== n) s.setPage(n);
    },
    [state],
  );
  function goPage(n: number) {
    const target = Math.max(1, Math.min(pageCount, n));
    state.getState().setPage(target);
    document
      .getElementById(`pdf-page-${target}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobilePages(false);
  }
  function chooseTool(next: Tool) {
    if (next === "signature" && !signature) {
      setSignOpen(true);
      return;
    }
    state.getState().setTool(next);
  }
  async function download() {
    if (!bytes || !file) return;
    state.getState().setExporting(true);
    state.getState().setError(null);
    try {
      const { exportPdf, completedName } =
        await import("@/features/pdf/export");
      const result = await exportPdf(bytes, annotations, forms);
      const blob = new Blob([new Uint8Array(result)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = completedName(file.name);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1700);
    } catch (e) {
      state
        .getState()
        .setError((e as Error).message || "Could not export this PDF.");
    } finally {
      state.getState().setExporting(false);
    }
  }
  return (
    <div className={`editor-shell ${pdf ? "editor-shell--loaded" : ""}`}>
      <input
        ref={input}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        aria-label="Open PDF"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void openFile(f);
          e.target.value = "";
        }}
      />
      <header className="editor-top">
        <div className="editor-top-left">
          <Brand compact />
          <span className="editor-divider" />
          <div className="file-title" title={file?.name}>
            {file?.name || "Untitled document"}
          </div>
          {pdf && (
            <button
              className="icon-only"
              aria-label="Open another PDF"
              title="Open another PDF"
              onClick={() => input.current?.click()}
            >
              <FilePlus2 size={17} />
            </button>
          )}
        </div>
        {pdf && (
          <>
            <div className="editor-top-center">
              <button
                className="icon-only"
                aria-label="Undo"
                title="Undo"
                disabled={!past.length}
                onClick={() => state.getState().undo()}
              >
                <Undo2 size={18} />
              </button>
              <button
                className="icon-only"
                aria-label="Redo"
                title="Redo"
                disabled={!future.length}
                onClick={() => state.getState().redo()}
              >
                <Redo2 size={18} />
              </button>
              <span className="editor-divider" />
              <button
                className="icon-only"
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => state.getState().setZoom(zoom - 0.1)}
              >
                <Minus size={17} />
              </button>
              <span className="zoom-value">{Math.round(zoom * 100)}%</span>
              <button
                className="icon-only"
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => state.getState().setZoom(zoom + 0.1)}
              >
                <Plus size={17} />
              </button>
            </div>
            <div className="editor-top-right">
              <span className="page-status">
                {currentPage} / {pageCount}
              </span>
              <Button
                onClick={() => void download()}
                loading={exporting}
                size="sm"
                aria-label="Download completed PDF"
              >
                <Download size={15} />
                <span>Download</span>
              </Button>
            </div>
          </>
        )}
      </header>
      {!pdf ? (
        <main className="editor-empty">
          <div className="empty-inner">
            <Link href="/" className="back-link">
              <ArrowLeft size={16} /> Back to home
            </Link>
            <div className="empty-icon">
              <FilePlus2 size={31} strokeWidth={1.5} />
            </div>
            <h1>Let’s get this PDF done.</h1>
            <p>
              Open a PDF to fill fields, add text, sign, and download. Your
              document stays on this device.
            </p>
            <Button onClick={() => input.current?.click()} loading={loading}>
              <FilePlus2 size={17} /> Choose a PDF
            </Button>
            <span>or drop a PDF anywhere on this page</span>
            {error && (
              <div role="alert" className="editor-error">
                {error}
              </div>
            )}
          </div>
          <div
            className="global-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void openFile(f);
            }}
          />
        </main>
      ) : (
        <>
          <div className="editor-toolrow">
            <button
              className="sidebar-toggle icon-only"
              aria-label={sidebar ? "Hide pages" : "Show pages"}
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={18} />
            </button>
            <div
              className="tool-group"
              role="toolbar"
              aria-label="Editing tools"
            >
              {tools.map((t) => (
                <button
                  key={t.id}
                  className={`tool-button ${tool === t.id ? "active" : ""}`}
                  aria-label={`${t.label} tool`}
                  aria-pressed={tool === t.id}
                  onClick={() => chooseTool(t.id)}
                >
                  <t.Icon size={17} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="tool-hint">
              {tool === "select"
                ? "Select an item to edit it"
                : tool === "text"
                  ? "Click a page to add text"
                  : tool === "signature"
                    ? "Click a page to place your signature"
                    : tool === "check"
                      ? "Click a page to add a check"
                      : "Draw on a page"}
            </div>
          </div>
          {selected && (
            <div className="properties-bar">
              <span>
                {selected.kind === "text"
                  ? "Text"
                  : selected.kind === "signature"
                    ? "Signature"
                    : selected.kind === "draw"
                      ? "Drawing"
                      : "Checkmark"}
              </span>
              {selected.kind === "text" && (
                <>
                  <label>
                    Size{" "}
                    <input
                      type="number"
                      min="8"
                      max="72"
                      value={selected.fontSize}
                      onChange={(e) =>
                        state.getState().update(selected.id, {
                          fontSize: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Color{" "}
                    <input
                      type="color"
                      value={selected.color}
                      onChange={(e) =>
                        state
                          .getState()
                          .update(selected.id, { color: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
              <button onClick={() => state.getState().remove(selected.id)}>
                Delete
              </button>
              <button
                aria-label="Close properties"
                onClick={() => state.getState().select(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="editor-body">
            <aside
              className={`pages-sidebar ${sidebar ? "" : "pages-sidebar--closed"} ${mobilePages ? "pages-sidebar--mobile-open" : ""}`}
              aria-label="Pages"
            >
              <div className="sidebar-title">
                Pages <span>{pageCount}</span>
              </div>
              <div className="thumbnail-list">
                {Array.from({ length: pageCount }, (_, i) => (
                  <PageThumbnail
                    key={i}
                    pdf={pdf}
                    pageNumber={i + 1}
                    active={currentPage === i + 1}
                    onClick={() => goPage(i + 1)}
                  />
                ))}
              </div>
            </aside>
            <main
              className="pdf-workspace"
              ref={workspace}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void openFile(f);
              }}
            >
              {Array.from({ length: pageCount }, (_, i) => (
                <PageView
                  key={i}
                  pdf={pdf}
                  pageNumber={i + 1}
                  zoom={zoom}
                  availableWidth={availableWidth}
                  onVisible={onVisible}
                />
              ))}
            </main>
          </div>
          <div className="mobile-editor-bottom">
            <button
              aria-label="Previous page"
              onClick={() => goPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setMobilePages(!mobilePages)}>
              Page {currentPage} of {pageCount}
            </button>
            <button
              aria-label="Next page"
              onClick={() => goPage(currentPage + 1)}
              disabled={currentPage === pageCount}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {error && (
            <div role="alert" className="editor-toast">
              <span>{error}</span>
              <button
                aria-label="Dismiss"
                onClick={() => state.getState().setError(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
        </>
      )}
      <SignatureDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        onInsert={(url) => {
          state.getState().setSignature(url);
          state.getState().setTool("signature");
        }}
      />
      {success && (
        <div className="download-success" role="status">
          Downloaded <span aria-hidden="true">✦</span>
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      )}
    </div>
  );
}
