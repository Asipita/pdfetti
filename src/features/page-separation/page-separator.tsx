"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowDownToLine,
  Check,
  FileUp,
  Files,
  LockKeyhole,
  RotateCcw,
  Scissors,
  ShieldCheck,
  X,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { loadPdf } from "@/features/pdf/loader";
import { validateFile } from "@/features/pdf/session";
import { formatPageRanges, parsePageRanges } from "./ranges";

function PageCard({
  document,
  index,
  selected,
  onToggle,
}: {
  document: PDFDocumentProxy;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const card = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const element = card.current;
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
      .getPage(index + 1)
      .then((page) => {
        if (cancelled || !canvas.current) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1, 170 / baseViewport.width);
        const viewport = page.getViewport({ scale });
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
  }, [document, index, visible]);

  return (
    <button
      ref={card}
      type="button"
      className={`separate-page-card${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={`Page ${index + 1}${selected ? ", selected" : ""}`}
      onClick={onToggle}
    >
      <span className="separate-page-preview">
        {visible ? <canvas ref={canvas} aria-hidden="true" /> : <span className="separate-page-placeholder" />}
        {!rendered && visible && <span className="separate-page-loading" aria-hidden="true" />}
        <span className="separate-page-check" aria-hidden="true">
          <Check size={14} />
        </span>
      </span>
      <span className="separate-page-number">Page {index + 1}</span>
    </button>
  );
}

export function PageSeparator() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [range, setRange] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragging, setDragging] = useState(false);
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
    setRangeError("");
    setSuccess(false);
    setLoading(true);
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const nextPdf = await loadPdf(bytes);
      setFile(nextFile);
      setPdf(nextPdf);
      setSelected([]);
      setRange("");
    } catch {
      setError("We couldn’t open this PDF. If it’s password-protected, save an unlocked copy and try again.");
    } finally {
      setLoading(false);
      if (input.current) input.current.value = "";
    }
  }, []);

  const updateRange = (value: string) => {
    setRange(value);
    setSuccess(false);
    if (!pdf || !value.trim()) {
      setSelected([]);
      setRangeError("");
      return;
    }
    try {
      setSelected(parsePageRanges(value, pdf.numPages));
      setRangeError("");
    } catch (cause) {
      setRangeError(cause instanceof Error ? cause.message : "Enter a valid page range.");
    }
  };

  const setPages = (pages: number[]) => {
    const unique = [...new Set(pages)].sort((a, b) => a - b);
    setSelected(unique);
    setRange(formatPageRanges(unique));
    setRangeError("");
    setError("");
    setSuccess(false);
  };

  const togglePage = (index: number) => {
    setPages(selected.includes(index) ? selected.filter((page) => page !== index) : [...selected, index]);
  };

  async function extractPages() {
    if (!file || !pdf || selected.length === 0 || rangeError) return;
    setError("");
    setExporting(true);
    setSuccess(false);
    try {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const output = await PDFDocument.create();
      const pages = await output.copyPages(source, [...selected]);
      pages.forEach((page) => output.addPage(page));
      const result = await output.save();
      const url = URL.createObjectURL(new Blob([result as BlobPart], { type: "application/pdf" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.pdf$/i, "")}-pages-${range.replace(/[^\d,-]+/g, "") || "selected"}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccess(true);
    } catch {
      setError("We couldn’t separate these pages. The PDF may use encryption or features this browser can’t copy.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="separate-page-site">
      <header className="marketing-nav">
        <div className="container nav-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="https://github.com/asipita/pdfetti" target="_blank" rel="noopener noreferrer">Open source</a>
            <Link href="/editor/" className="ui-button ui-button--outline nav-action">Open PDF editor</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="separate-hero">
          <div className="container">
            <div className="separate-intro">
              <span className="separate-eyebrow"><Scissors size={15} /> PDF PAGE SEPARATOR</span>
              <h1>Keep the pages<br />you <em>actually need.</em></h1>
              <p>Select pages visually or enter a page range. PDFetti creates a new PDF with just those pages, right in your browser.</p>
              <div className="separate-trust"><span><ShieldCheck size={16} /> Your file stays on your device</span><span><LockKeyhole size={15} /> Free, no account</span></div>
            </div>

            <section
              className={`separate-tool${dragging ? " is-dragging" : ""}`}
              aria-label="Separate PDF pages"
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void openFile(event.dataTransfer.files[0]); }}
            >
              <input ref={input} className="sr-only" type="file" accept=".pdf,application/pdf" aria-label="Choose a PDF to separate" onChange={(event) => void openFile(event.target.files?.[0])} />
              {!pdf ? (
                <div className="separate-upload">
                  <div className="separate-upload-icon"><FileUp size={24} /></div>
                  <h2>{loading ? "Opening your PDF…" : "Start with a PDF"}</h2>
                  <p>Choose a file, or drag it here. Up to 50 MB.</p>
                  <Button onClick={() => input.current?.click()} loading={loading}><Files size={17} /> Choose a PDF</Button>
                  {error && <p className="separate-error" role="alert">{error}</p>}
                </div>
              ) : (
                <div className="separate-workspace">
                  <div className="separate-filebar">
                    <div className="separate-fileinfo"><span className="separate-file-icon"><Files size={19} /></span><span><strong title={file?.name}>{file?.name}</strong><small>{pdf.numPages} {pdf.numPages === 1 ? "page" : "pages"} · {((file?.size ?? 0) / (1024 * 1024)).toFixed(1)} MB</small></span></div>
                    <Button variant="outline" size="sm" onClick={() => input.current?.click()}><RotateCcw size={15} /> Change PDF</Button>
                  </div>

                  <div className="separate-selection">
                    <div className="separate-selection-head">
                      <div><span className="separate-step">01</span><div><h2>Choose pages</h2><p>Click page previews or type page numbers and ranges.</p></div></div>
                      <span className="separate-count">{selected.length} of {pdf.numPages} selected</span>
                    </div>
                    <label className="separate-range-label" htmlFor="page-range">Pages to keep</label>
                    <div className={`separate-range-wrap${rangeError ? " has-error" : ""}`}>
                      <input id="page-range" type="text" inputMode="text" value={range} placeholder="e.g. 1-3, 5, 8-10" aria-describedby="page-range-help" aria-invalid={Boolean(rangeError)} onChange={(event) => updateRange(event.target.value)} />
                      {range && <button type="button" className="separate-clear-range" aria-label="Clear page selection" onClick={() => updateRange("")}><X size={16} /></button>}
                    </div>
                    <div className="separate-range-hint" id="page-range-help">
                      {rangeError ? <span className="separate-error" role="alert">{rangeError}</span> : <span>Use commas for separate pages and hyphens for a range.</span>}
                      <div className="separate-shortcuts">
                        <button type="button" onClick={() => setPages(Array.from({ length: pdf.numPages }, (_, index) => index))}>All</button>
                        <span>·</span>
                        <button type="button" onClick={() => setPages([])}>Clear</button>
                        <span>·</span>
                        <button type="button" onClick={() => setPages(Array.from({ length: pdf.numPages }, (_, index) => index).filter((index) => !selected.includes(index)))}>Invert</button>
                      </div>
                    </div>

                    <div className="separate-page-grid" aria-label="PDF page previews">
                      {Array.from({ length: pdf.numPages }, (_, index) => (
                        <PageCard key={`${file?.name}-${index}`} document={pdf} index={index} selected={selected.includes(index)} onToggle={() => togglePage(index)} />
                      ))}
                    </div>
                  </div>

                  <div className="separate-export">
                    <div><span className="separate-step">02</span><div><h2>Your new PDF</h2><p>Selected pages stay in their original order.</p></div></div>
                    <Button onClick={() => void extractPages()} loading={exporting} disabled={selected.length === 0 || Boolean(rangeError)}><ArrowDownToLine size={17} /> Extract {selected.length || "selected"} {selected.length === 1 ? "page" : "pages"}</Button>
                  </div>
                  {success && <p className="separate-success" role="status"><Check size={16} /> Your new PDF is ready. The original file is unchanged.</p>}
                  {error && <p className="separate-error separate-export-error" role="alert">{error}</p>}
                </div>
              )}
            </section>
            <p className="separate-privacy-note"><LockKeyhole size={14} /> Your PDF is processed locally and never uploaded.</p>
          </div>
        </section>

        <section className="separate-guide" id="how-it-works">
          <div className="container">
            <div className="separate-guide-heading"><span>STRAIGHTFORWARD BY DESIGN</span><h2>Separate pages in three steps.</h2></div>
            <div className="separate-guide-grid">
              <article><span>01</span><h3>Open your PDF</h3><p>Choose a PDF from your device. It opens in your browser and stays there.</p></article>
              <article><span>02</span><h3>Pick the pages</h3><p>Click page previews, enter a range like 2–5, or combine pages like 1, 4, 7–9.</p></article>
              <article><span>03</span><h3>Save a new PDF</h3><p>Download a separate file containing only the pages you selected. Your original stays as it was.</p></article>
            </div>
          </div>
        </section>

        <section className="separate-faq">
          <div className="container separate-faq-inner">
            <div><span className="separate-faq-kicker">GOOD TO KNOW</span><h2>PDF page extraction, explained.</h2></div>
            <div className="separate-faq-list">
              <article><h3>Can I select pages in any order?</h3><p>You can choose any combination of pages. The new PDF keeps their original order so it reads naturally.</p></article>
              <article><h3>Does this change my original PDF?</h3><p>No. PDFetti creates a new file with your selected pages. Your original file is left untouched.</p></article>
              <article><h3>Are my documents uploaded?</h3><p>No. Page previews and extraction happen in your browser. Your file is not sent to a PDFetti server.</p></article>
              <article><h3>Will forms and signatures work the same way?</h3><p>Visible page content is copied, but interactive form fields and document-level features can vary between PDFs. Editing a digitally signed PDF can invalidate its signature.</p></article>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><Brand /><span>PDF tools that keep things simple.</span><nav aria-label="Footer"><a href="/privacy/">Privacy</a><a href="/editor/">PDF editor</a><a href="/organize-pdf/">Organize pages</a><a href="https://github.com/asipita/pdfetti" target="_blank" rel="noopener noreferrer">GitHub</a></nav></div></footer>
    </div>
  );
}
