"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { degrees, PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  Check,
  FileUp,
  Files,
  GripVertical,
  LockKeyhole,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { loadPdf } from "@/features/pdf/loader";
import { validateFile } from "@/features/pdf/session";

type PageItem = { originalIndex: number; rotation: number };

function PagePreview({
  document,
  pageNumber,
  rotation,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  rotation: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const element = holder.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    if (!visible || !canvas.current) return;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;
    void document
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled || !canvas.current) return;
        const baseViewport = page.getViewport({ scale: 1, rotation: page.rotate + rotation });
        const scale = Math.min(1, 170 / baseViewport.width);
        const viewport = page.getViewport({ scale, rotation: page.rotate + rotation });
        const context = canvas.current.getContext("2d");
        if (!context) return;
        canvas.current.width = Math.ceil(viewport.width);
        canvas.current.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas: canvas.current, canvasContext: context, viewport });
        return renderTask.promise.then(() => {
          if (!cancelled) setRendered(true);
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber, rotation, visible]);

  return (
    <div ref={holder} className="organize-page-preview">
      {visible ? <canvas ref={canvas} aria-hidden="true" /> : <span className="organize-page-placeholder" />}
      {!rendered && visible && <span className="organize-page-loading" aria-hidden="true" />}
    </div>
  );
}

export function PageOrganizer() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ originalIndex: number; position: "before" | "after" } | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => () => void pdf?.destroy(), [pdf]);

  const openFile = useCallback(async (nextFile?: File) => {
    if (!nextFile) return;
    const issue = validateFile(nextFile);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setSuccess(false);
    setLoading(true);
    try {
      const nextPdf = await loadPdf(new Uint8Array(await nextFile.arrayBuffer()));
      setFile(nextFile);
      setPdf(nextPdf);
      setPages(Array.from({ length: nextPdf.numPages }, (_, originalIndex) => ({ originalIndex, rotation: 0 })));
      setSelected([]);
    } catch {
      setError("We couldn’t open this PDF. If it’s password-protected, save an unlocked copy and try again.");
    } finally {
      setLoading(false);
      if (input.current) input.current.value = "";
    }
  }, []);

  const updateSelection = (originalIndex: number) => {
    setSelected((current) =>
      current.includes(originalIndex)
        ? current.filter((index) => index !== originalIndex)
        : [...current, originalIndex],
    );
    setSuccess(false);
  };

  const selectAll = () => {
    setSelected(pages.map((page) => page.originalIndex));
    setSuccess(false);
  };

  const clearSelection = () => {
    setSelected([]);
    setSuccess(false);
  };

  const moveSelected = (direction: -1 | 1) => {
    const selectedPages = new Set(selected);
    const next = [...pages];
    if (direction < 0) {
      for (let index = 1; index < next.length; index += 1) {
        if (selectedPages.has(next[index].originalIndex) && !selectedPages.has(next[index - 1].originalIndex)) {
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
        }
      }
    } else {
      for (let index = next.length - 2; index >= 0; index -= 1) {
        if (selectedPages.has(next[index].originalIndex) && !selectedPages.has(next[index + 1].originalIndex)) {
          [next[index], next[index + 1]] = [next[index + 1], next[index]];
        }
      }
    }
    setPages(next);
    setSuccess(false);
  };

  const movePageTo = (sourceOriginalIndex: number, targetOriginalIndex: number, position: "before" | "after") => {
    if (exporting || sourceOriginalIndex === targetOriginalIndex) return;
    setPages((current) => {
      const sourceIndex = current.findIndex((page) => page.originalIndex === sourceOriginalIndex);
      const targetIndex = current.findIndex((page) => page.originalIndex === targetOriginalIndex);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      const adjustedTarget = targetIndex - (sourceIndex < targetIndex ? 1 : 0);
      next.splice(adjustedTarget + (position === "after" ? 1 : 0), 0, moved);
      return next;
    });
    setSuccess(false);
  };

  const rotateSelected = (degreesToAdd: number) => {
    const selectedPages = new Set(selected);
    setPages((current) => current.map((page) =>
      selectedPages.has(page.originalIndex)
        ? { ...page, rotation: (page.rotation + degreesToAdd + 360) % 360 }
        : page,
    ));
    setSuccess(false);
  };

  const removeSelected = () => {
    if (selected.length >= pages.length) {
      setError("Keep at least one page in the PDF.");
      return;
    }
    setPages((current) => current.filter((page) => !selected.includes(page.originalIndex)));
    setSelected([]);
    setError("");
    setSuccess(false);
  };

  const resetPages = () => {
    if (!pdf) return;
    setPages(Array.from({ length: pdf.numPages }, (_, originalIndex) => ({ originalIndex, rotation: 0 })));
    setSelected([]);
    setError("");
    setSuccess(false);
  };

  async function downloadOrganizedPdf() {
    if (!file || pages.length === 0) return;
    setError("");
    setExporting(true);
    setSuccess(false);
    try {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const output = await PDFDocument.create();
      const copiedPages = await output.copyPages(source, pages.map((page) => page.originalIndex));
      copiedPages.forEach((page, index) => {
        const extraRotation = pages[index].rotation;
        if (extraRotation) page.setRotation(degrees((page.getRotation().angle + extraRotation) % 360));
        output.addPage(page);
      });
      const result = await output.save();
      const url = URL.createObjectURL(new Blob([result as BlobPart], { type: "application/pdf" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.pdf$/i, "")}-organized.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccess(true);
    } catch {
      setError("We couldn’t organize these pages. The PDF may use encryption or features this browser can’t copy.");
    } finally {
      setExporting(false);
    }
  }

  const allSelected = pages.length > 0 && selected.length === pages.length;

  return (
    <div className="separate-page-site organize-page-site">
      <header className="marketing-nav">
        <div className="container nav-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <Link href="/extract-pdf-pages/">Extract pages</Link>
            <Link href="/merge-pdf/">Merge PDFs</Link>
            <a href="https://github.com/asipita/pdfetti" target="_blank" rel="noopener noreferrer">Open source</a>
            <Link href="/editor/" className="ui-button ui-button--outline nav-action">Open PDF editor</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="separate-hero organize-hero">
          <div className="container">
            <div className="separate-intro">
              <span className="separate-eyebrow"><Files size={15} /> ORGANIZE PDF PAGES</span>
              <h1>Put every page<br />in its place.</h1>
              <p>Reorder, rotate, or remove pages. Preview your changes and download an organized copy, privately in your browser.</p>
              <div className="separate-trust"><span><LockKeyhole size={15} /> Your file stays on your device</span><span>Free, no account</span></div>
            </div>

            <section
              className={`organize-tool${dragging ? " is-dragging" : ""}`}
              aria-label="Organize PDF pages"
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void openFile(event.dataTransfer.files[0]); }}
            >
              <input ref={input} className="sr-only" type="file" accept=".pdf,application/pdf" aria-label="Choose a PDF to organize" onChange={(event) => void openFile(event.target.files?.[0])} />
              {!pdf ? (
                <div className="separate-upload">
                  <div className="separate-upload-icon"><FileUp size={24} /></div>
                  <h2>{loading ? "Opening your PDF…" : "Start with a PDF"}</h2>
                  <p>Choose a file, or drag it here. Up to 50 MB.</p>
                  <Button onClick={() => input.current?.click()} loading={loading}><Files size={17} /> Choose a PDF</Button>
                  {error && <p className="separate-error" role="alert">{error}</p>}
                </div>
              ) : (
                <div className="organize-workspace">
                  <div className="separate-filebar">
                    <div className="separate-fileinfo"><span className="separate-file-icon"><Files size={19} /></span><span><strong title={file?.name}>{file?.name}</strong><small>{pages.length} of {pdf.numPages} pages · {((file?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB</small></span></div>
                    <div className="organize-file-actions">
                      <Button variant="outline" size="sm" onClick={resetPages} disabled={pages.length === pdf.numPages && !pages.some((page, index) => page.originalIndex !== index || page.rotation !== 0)}><Undo2 size={15} /> Reset</Button>
                      <Button variant="outline" size="sm" onClick={() => input.current?.click()}><RotateCcw size={15} /> Change PDF</Button>
                    </div>
                  </div>

                  <div className="organize-controls">
                    <div className="organize-selection-summary">
                      <strong>{selected.length ? `${selected.length} selected` : "Select pages to organize"}</strong>
                      <span>{allSelected ? "Keep at least one page when removing." : "Changes apply to all selected pages."}</span>
                    </div>
                    <div className="organize-control-buttons">
                      <Button variant="outline" size="sm" onClick={() => moveSelected(-1)} disabled={!selected.length}><ArrowUp size={15} /> Move earlier</Button>
                      <Button variant="outline" size="sm" onClick={() => moveSelected(1)} disabled={!selected.length}><ArrowDown size={15} /> Move later</Button>
                      <Button variant="outline" size="sm" onClick={() => rotateSelected(-90)} disabled={!selected.length}><RotateCcw size={15} /> Rotate left</Button>
                      <Button variant="outline" size="sm" onClick={() => rotateSelected(90)} disabled={!selected.length}><RotateCw size={15} /> Rotate right</Button>
                      <Button variant="outline" size="sm" onClick={removeSelected} disabled={!selected.length || allSelected}><Trash2 size={15} /> Remove</Button>
                    </div>
                    <div className="organize-select-shortcuts">
                      <button type="button" onClick={allSelected ? clearSelection : selectAll}>{allSelected ? "Clear selection" : "Select all"}</button>
                      <span>·</span>
                      <button type="button" onClick={clearSelection} disabled={!selected.length}>Deselect all</button>
                    </div>
                  </div>

                  <p className="organize-drag-hint">Drag a page by its handle to reorder it. The toolbar moves all selected pages.</p>
                  <div className="organize-page-grid" aria-label="PDF pages">
                    {pages.map((page, position) => (
                      <article
                        key={page.originalIndex}
                        className={`organize-page-card${selected.includes(page.originalIndex) ? " is-selected" : ""}${draggedPageIndex === page.originalIndex ? " is-dragging" : ""}${dropTarget?.originalIndex === page.originalIndex ? ` is-drop-target is-drop-${dropTarget.position}` : ""}`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                          if (page.originalIndex !== draggedPageIndex) {
                            const rect = event.currentTarget.getBoundingClientRect();
                            const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                            setDropTarget((current) => current?.originalIndex === page.originalIndex && current.position === position
                              ? current
                              : { originalIndex: page.originalIndex, position });
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const sourceValue = event.dataTransfer.getData("text/plain");
                          const rect = event.currentTarget.getBoundingClientRect();
                          const dropPosition = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                          if (/^\d+$/.test(sourceValue)) movePageTo(Number(sourceValue), page.originalIndex, dropPosition);
                          setDraggedPageIndex(null);
                          setDropTarget(null);
                        }}
                      >
                        <div className="organize-page-topline">
                          <label className="organize-page-select">
                            <input type="checkbox" checked={selected.includes(page.originalIndex)} onChange={() => updateSelection(page.originalIndex)} aria-label={`Select page ${page.originalIndex + 1}`} />
                            <span className="organize-page-position">Position {position + 1}</span>
                          </label>
                          <span
                            className="organize-drag-handle"
                            draggable={!exporting}
                            title="Drag this handle to reorder the page"
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", String(page.originalIndex));
                              setDraggedPageIndex(page.originalIndex);
                            }}
                            onDragEnd={() => {
                              setDraggedPageIndex(null);
                              setDropTarget(null);
                            }}
                          >
                            <GripVertical size={15} aria-hidden="true" />
                            <span>Drag</span>
                          </span>
                        </div>
                        <PagePreview document={pdf} pageNumber={page.originalIndex + 1} rotation={page.rotation} />
                        <span className="organize-page-name">Original page {page.originalIndex + 1}</span>
                      </article>
                    ))}
                  </div>

                  <div className="organize-export">
                    <div><span className="separate-step">02</span><div><h2>Save your organized PDF</h2><p>The new file follows the order shown above. Your original stays unchanged.</p></div></div>
                    <Button onClick={() => void downloadOrganizedPdf()} loading={exporting} disabled={!pages.length}><ArrowDownToLine size={17} /> Download organized PDF</Button>
                  </div>
                  {success && <p className="separate-success" role="status"><Check size={16} /> Your organized PDF is ready. The original file is unchanged.</p>}
                  {error && <p className="separate-error organize-export-error" role="alert">{error}</p>}
                </div>
              )}
            </section>
            <p className="separate-privacy-note"><LockKeyhole size={14} /> Your PDF is processed locally and never uploaded.</p>
          </div>
        </section>

        <section className="separate-guide" id="how-it-works">
          <div className="container">
            <div className="separate-guide-heading"><span>PAGE MANAGEMENT, MADE SIMPLE</span><h2>Organize in three steps.</h2></div>
            <div className="separate-guide-grid">
              <article><span>01</span><h3>Open your PDF</h3><p>Choose a file from your device. The pages preview locally in your browser.</p></article>
              <article><span>02</span><h3>Make your changes</h3><p>Select pages to move earlier or later, rotate, or remove them.</p></article>
              <article><span>03</span><h3>Download the new copy</h3><p>Your original stays untouched while the organized PDF downloads to your device.</p></article>
            </div>
          </div>
        </section>

        <section className="separate-faq">
          <div className="container separate-faq-inner">
            <div><span className="separate-faq-kicker">GOOD TO KNOW</span><h2>Organizing PDF pages, explained.</h2></div>
            <div className="separate-faq-list">
              <article><h3>Can I change the order of more than one page?</h3><p>Yes. Select one or more pages, then move the selected pages earlier or later together.</p></article>
              <article><h3>Can I remove every page?</h3><p>A PDF needs at least one page, so the organizer keeps one page in the finished file.</p></article>
              <article><h3>Does this change my original PDF?</h3><p>No. PDFetti downloads a new copy with your changes and leaves the original file untouched.</p></article>
              <article><h3>Will forms and signatures work the same way?</h3><p>Visible page content is copied, but interactive fields and document-level features can vary. Editing a digitally signed PDF can invalidate its signature.</p></article>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><Brand /><span>PDF tools that keep things simple.</span><nav aria-label="Footer"><a href="/privacy/">Privacy</a><a href="/editor/">PDF editor</a><a href="/extract-pdf-pages/">Extract pages</a><a href="/merge-pdf/">Merge PDFs</a><a href="https://github.com/asipita/pdfetti" target="_blank" rel="noopener noreferrer">GitHub</a></nav></div></footer>
    </div>
  );
}
