"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  Check,
  FileUp,
  Files,
  LockKeyhole,
  Plus,
  Trash2,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { loadPdf } from "@/features/pdf/loader";
import { validateFile } from "@/features/pdf/session";

type MergeFile = {
  id: string;
  file: File;
  pageCount: number;
  preview: PDFDocumentProxy;
};

const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

function FirstPagePreview({ document }: { document: PDFDocumentProxy }) {
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
      { rootMargin: "140px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    let cancelled = false;
    if (!visible || !canvas.current) return;
    let renderTask: { cancel: () => void; promise: Promise<void> } | undefined;
    void document
      .getPage(1)
      .then((page) => {
        if (cancelled || !canvas.current) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1, 150 / baseViewport.width) });
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
  }, [document, visible]);

  return (
    <div ref={holder} className="merge-file-preview">
      {visible ? <canvas ref={canvas} aria-hidden="true" /> : <span className="merge-preview-placeholder" />}
      {!rendered && visible && <span className="merge-preview-loading" aria-hidden="true" />}
    </div>
  );
}

export function PdfMerger() {
  const input = useRef<HTMLInputElement>(null);
  const previews = useRef(new Map<string, PDFDocumentProxy>());
  const [files, setFiles] = useState<MergeFile[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => () => {
    previews.current.forEach((document) => void document.destroy());
    previews.current.clear();
  }, []);

  const addFiles = useCallback(async (incoming?: FileList | File[]) => {
    if (!incoming?.length || loading || merging) return;
    setError("");
    setSuccess(false);
    setLoading(true);
    const accepted: MergeFile[] = [];
    const issues: string[] = [];
    let totalSize = files.reduce((sum, item) => sum + item.file.size, 0);

    for (const file of Array.from(incoming)) {
      const issue = validateFile(file);
      if (issue) {
        issues.push(`${file.name}: ${issue}`);
        continue;
      }
      if (files.length + accepted.length >= MAX_FILES) {
        issues.push(`You can merge up to ${MAX_FILES} PDFs at a time.`);
        break;
      }
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        issues.push("Together, selected files must be 100 MB or smaller.");
        continue;
      }

      try {
        const preview = await loadPdf(new Uint8Array(await file.arrayBuffer()));
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        previews.current.set(id, preview);
        accepted.push({ id, file, pageCount: preview.numPages, preview });
        totalSize += file.size;
      } catch {
        issues.push(`${file.name}: couldn’t open this PDF. Save an unlocked copy if it is password-protected.`);
      }
    }

    if (accepted.length) setFiles((current) => [...current, ...accepted]);
    setError(issues.join(" "));
    setLoading(false);
    if (input.current) input.current.value = "";
  }, [files, loading, merging]);

  const moveFile = (index: number, direction: -1 | 1) => {
    if (loading || merging) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;
    setFiles((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setSuccess(false);
  };

  const removeFile = (id: string) => {
    if (loading || merging) return;
    const preview = previews.current.get(id);
    if (preview) void preview.destroy();
    previews.current.delete(id);
    setFiles((current) => current.filter((item) => item.id !== id));
    setSuccess(false);
  };

  const clearFiles = () => {
    if (loading || merging) return;
    previews.current.forEach((document) => void document.destroy());
    previews.current.clear();
    setFiles([]);
    setError("");
    setSuccess(false);
  };

  async function mergeFiles() {
    if (files.length < 2) return;
    setError("");
    setMerging(true);
    setSuccess(false);
    try {
      const output = await PDFDocument.create();
      for (const item of files) {
        const source = await PDFDocument.load(await item.file.arrayBuffer());
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach((page) => output.addPage(page));
      }
      const result = await output.save();
      const url = URL.createObjectURL(new Blob([result as BlobPart], { type: "application/pdf" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${files[0].file.name.replace(/\.pdf$/i, "")}-merged.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccess(true);
    } catch {
      setError("We couldn’t merge these files. One PDF may use encryption or features this browser can’t copy.");
    } finally {
      setMerging(false);
    }
  }

  const pageCount = files.reduce((sum, item) => sum + item.pageCount, 0);
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <div className="separate-page-site merge-page-site">
      <header className="marketing-nav">
        <div className="container nav-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <Link href="/organize-pdf/">Organize pages</Link>
            <a href="https://github.com/asipita/pdfetti" target="_blank" rel="noopener noreferrer">Open source</a>
            <Link href="/editor/" className="ui-button ui-button--outline nav-action">Open PDF editor</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="separate-hero merge-hero">
          <div className="container">
            <div className="separate-intro">
              <span className="separate-eyebrow"><Files size={15} /> MERGE PDF FILES</span>
              <h1>Bring your PDFs<br />together.</h1>
              <p>Add files, arrange their order, and download one combined PDF. Your documents stay in your browser.</p>
              <div className="separate-trust"><span><LockKeyhole size={15} /> Your files stay on your device</span><span>Free, no account</span></div>
            </div>

            <section
              className={`merge-tool${dragging ? " is-dragging" : ""}`}
              aria-label="Merge PDF files"
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}
            >
              <input ref={input} className="sr-only" type="file" accept=".pdf,application/pdf" multiple aria-label="Choose PDF files to merge" onChange={(event) => void addFiles(event.target.files ?? undefined)} />
              {files.length === 0 ? (
                <div className="merge-upload">
                  <div className="separate-upload-icon"><FileUp size={24} /></div>
                  <h2>{loading ? "Opening your PDFs…" : "Start with your PDF files"}</h2>
                  <p>Choose two or more PDFs, or drag them here. Up to 10 files, 50 MB each, 100 MB total.</p>
                  <Button onClick={() => input.current?.click()} loading={loading}><Files size={17} /> Choose PDF files</Button>
                  {error && <p className="separate-error" role="alert">{error}</p>}
                </div>
              ) : (
                <div className="merge-workspace">
                  <div className="merge-filebar">
                    <div className="separate-fileinfo">
                      <span className="separate-file-icon"><Files size={19} /></span>
                      <span><strong>{files.length} {files.length === 1 ? "PDF" : "PDFs"} ready</strong><small>{pageCount} pages · {(totalSize / (1024 * 1024)).toFixed(1)} MB total</small></span>
                    </div>
                    <div className="merge-file-actions">
                      <Button variant="outline" size="sm" onClick={clearFiles} disabled={loading || merging}>Clear all</Button>
                      <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={loading || merging}><Plus size={15} /> Add PDFs</Button>
                    </div>
                  </div>

                  <div className="merge-list-heading">
                    <div><span className="separate-step">01</span><div><h2>Set the file order</h2><p>Each PDF’s pages stay together in the order shown.</p></div></div>
                    <span className="merge-list-count">{files.length} files</span>
                  </div>

                  <ol className="merge-file-list" aria-label="PDF merge order">
                    {files.map((item, index) => (
                      <li className="merge-file-item" key={item.id}>
                        <span className="merge-file-position" aria-label={`File ${index + 1}`}>{index + 1}</span>
                        <FirstPagePreview document={item.preview} />
                        <div className="merge-file-details">
                          <strong title={item.file.name}>{item.file.name}</strong>
                          <span>{item.pageCount} {item.pageCount === 1 ? "page" : "pages"} · {(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                        <div className="merge-item-actions">
                          <button type="button" className="merge-icon-button" onClick={() => moveFile(index, -1)} disabled={index === 0 || loading || merging} aria-label={`Move ${item.file.name} earlier`} title="Move earlier"><ArrowUp size={16} /></button>
                          <button type="button" className="merge-icon-button" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1 || loading || merging} aria-label={`Move ${item.file.name} later`} title="Move later"><ArrowDown size={16} /></button>
                          <button type="button" className="merge-icon-button is-remove" onClick={() => removeFile(item.id)} disabled={loading || merging} aria-label={`Remove ${item.file.name}`} title="Remove file"><Trash2 size={16} /></button>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <button type="button" className="merge-add-more" onClick={() => input.current?.click()} disabled={loading || merging}>
                    <Plus size={16} /> Add another PDF
                  </button>

                  <div className="merge-export">
                    <div><span className="separate-step">02</span><div><h2>Combine into one PDF</h2><p>{files.length < 2 ? "Add one more PDF to enable merging." : "Pages are added in the file order above."}</p></div></div>
                    <Button onClick={() => void mergeFiles()} loading={merging} disabled={files.length < 2 || loading}><ArrowDownToLine size={17} /> Merge {files.length} {files.length === 1 ? "PDF" : "PDFs"}</Button>
                  </div>
                  {success && <p className="separate-success" role="status"><Check size={16} /> Your merged PDF is ready. The original files are unchanged.</p>}
                  {error && <p className="separate-error merge-error" role="alert">{error}</p>}
                  {loading && <p className="merge-loading-message" role="status">Opening added PDFs…</p>}
                </div>
              )}
            </section>
            <p className="separate-privacy-note"><LockKeyhole size={14} /> Your PDFs are processed locally and never uploaded.</p>
          </div>
        </section>

        <section className="separate-guide" id="how-it-works">
          <div className="container">
            <div className="separate-guide-heading"><span>ONE DOCUMENT, IN THE RIGHT ORDER</span><h2>Merge PDFs in three steps.</h2></div>
            <div className="separate-guide-grid">
              <article><span>01</span><h3>Add PDF files</h3><p>Choose two or more PDFs from your device. Their first pages appear as previews.</p></article>
              <article><span>02</span><h3>Arrange the files</h3><p>Move each document earlier or later, or remove it from the merge.</p></article>
              <article><span>03</span><h3>Download one PDF</h3><p>Get one new document with every page in the order you chose.</p></article>
            </div>
          </div>
        </section>

        <section className="separate-faq">
          <div className="container separate-faq-inner">
            <div><span className="separate-faq-kicker">GOOD TO KNOW</span><h2>PDF merging, explained.</h2></div>
            <div className="separate-faq-list">
              <article><h3>Can I change the order before merging?</h3><p>Yes. Use the up and down buttons to set the order. The pages from each PDF stay together.</p></article>
              <article><h3>Does merging change my original files?</h3><p>No. PDFetti creates a new combined PDF and leaves each source file untouched.</p></article>
              <article><h3>Are my documents uploaded?</h3><p>No. Previews and merging happen locally in your browser. The files are not sent to a PDFetti server.</p></article>
              <article><h3>Will interactive forms and signatures work the same way?</h3><p>Visible page content is copied, but interactive fields and document-level features can vary. Changing a digitally signed PDF can invalidate its signature.</p></article>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><Brand /><span>PDF tools that keep things simple.</span><nav aria-label="Footer"><a href="/privacy/">Privacy</a><a href="/editor/">PDF editor</a><a href="/extract-pdf-pages/">Extract pages</a><a href="/organize-pdf/">Organize pages</a><a href="https://github.com/asipita/pdfetti" target="_blank" rel="noopener noreferrer">GitHub</a></nav></div></footer>
    </div>
  );
}
