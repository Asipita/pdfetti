import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowUpDown,
  FilePenLine,
  Files,
  LockKeyhole,
  Plus,
  Scissors,
} from "lucide-react";
import { Brand } from "@/components/shared/brand";

const features = [
  {
    number: "01",
    title: "Fill the blanks.",
    description:
      "Type straight into PDF form fields, or place text anywhere on the page.",
  },
  {
    number: "02",
    title: "Make your mark.",
    description:
      "Add a signature, check a box, and position each detail exactly where it belongs.",
  },
  {
    number: "03",
    title: "Take the final copy.",
    description:
      "Download the finished PDF in one click. No account, watermark, or payment step.",
  },
];
const repositoryUrl = "https://github.com/asipita/pdfetti";

export default function Home() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDFetti",
    sameAs: repositoryUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Free browser-based PDF tools for annotating, extracting pages, organizing, and merging PDFs.",
  };

  return (
    <div className="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="home-opening">
        <header className="home-nav">
          <div className="container home-nav-inner">
            <Brand />
            <nav aria-label="Main navigation">
              <a href="#features">Features</a>
              <a href="#privacy">Privacy</a>
              <Link href="/extract-pdf-pages/">Extract pages</Link>
              <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <Link href="/editor/" className="home-nav-action">
                Open editor <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </header>

        <main>
          <section className="home-hero container" aria-labelledby="home-title">
            <div className="home-tool-grid" role="group" aria-label="PDFetti tools">
              <Link href="/editor/" className="home-tool-card home-tool-card--annotation">
                <div className="home-tool-art home-tool-art--annotation" aria-hidden="true">
                  <div className="home-art-paper">
                    <span className="home-art-line home-art-line--wide" />
                    <span className="home-art-line" />
                    <span className="home-art-line home-art-line--short" />
                    <span className="home-art-field"><i /> <i /></span>
                    <span className="home-art-signature">Alex Morgan</span>
                  </div>
                  <span className="home-art-note"><FilePenLine size={14} /> Add your mark</span>
                </div>
                <div className="home-tool-card-copy">
                  <span className="home-tool-title">Annotation</span>
                  <p>Fill forms, add text, and sign.</p>
                  <span className="home-tool-action">Open the editor <ArrowUpRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
              <Link href="/extract-pdf-pages/" className="home-tool-card home-tool-card--separation">
                <div className="home-tool-art home-tool-art--separation" aria-hidden="true">
                  <div className="home-art-pages">
                    <span className="home-art-page"><i /><i /><i /></span>
                    <span className="home-art-page is-picked"><i /><i /><i /></span>
                    <span className="home-art-page"><i /><i /><i /></span>
                    <span className="home-art-page is-picked"><i /><i /><i /></span>
                  </div>
                  <span className="home-art-note"><Scissors size={14} /> Keep just these</span>
                </div>
                <div className="home-tool-card-copy">
                  <span className="home-tool-title">Page extraction</span>
                  <p>Keep the pages you need in a new PDF.</p>
                  <span className="home-tool-action">Separate pages <ArrowUpRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
              <Link href="/organize-pdf/" className="home-tool-card home-tool-card--organization">
                <div className="home-tool-art home-tool-art--organization" aria-hidden="true">
                  <div className="home-art-pages">
                    <span className="home-art-page"><i /><i /><i /></span>
                    <span className="home-art-page"><i /><i /><i /></span>
                    <span className="home-art-page is-picked"><i /><i /><i /></span>
                  </div>
                  <span className="home-art-note"><ArrowUpDown size={14} /> Reorder pages</span>
                </div>
                <div className="home-tool-card-copy">
                  <span className="home-tool-title">Organize pages</span>
                  <p>Reorder, rotate, or remove pages.</p>
                  <span className="home-tool-action">Organize PDF <ArrowUpRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
              <Link href="/merge-pdf/" className="home-tool-card home-tool-card--merge">
                <div className="home-tool-art home-tool-art--merge" aria-hidden="true">
                  <div className="home-art-merge-files">
                    <span className="home-art-page"><i /><i /><i /></span>
                    <span className="home-art-page"><i /><i /><i /></span>
                    <Plus className="home-art-merge-plus" size={23} />
                    <span className="home-art-page is-picked"><i /><i /><i /></span>
                  </div>
                  <span className="home-art-note"><Files size={14} /> Combine PDFs</span>
                </div>
                <div className="home-tool-card-copy">
                  <span className="home-tool-title">Merge PDFs</span>
                  <p>Combine files in the order you choose.</p>
                  <span className="home-tool-action">Merge PDFs <ArrowUpRight size={16} aria-hidden="true" /></span>
                </div>
              </Link>
            </div>
            <div className="home-hero-heading">
              <h1 id="home-title">Your PDF, finished<span>.</span></h1>
              <p>Free, private tools for working with PDFs.</p>
            </div>
          </section>

          <section className="home-product" aria-labelledby="product-heading">
            <div className="container home-product-inner">
              <div className="home-product-label">
                <span id="product-heading">A CLOSER LOOK</span>
                <span>Everything in its place. Especially your document.</span>
              </div>
              <div className="home-product-frame">
                <Image
                  className="home-product-desktop"
                  src="/editor-desktop.webp"
                  alt="PDFetti editor showing a completed form with filled fields, a checkmark, and a signature"
                  width={1440}
                  height={1000}
                  priority
                  unoptimized
                />
                <Image
                  className="home-product-mobile"
                  src="/editor-mobile.webp"
                  alt="PDFetti editor on a phone showing a filled PDF form"
                  width={390}
                  height={844}
                  priority
                  unoptimized
                />
              </div>
              <div className="home-product-caption">
                <span>THE EDITOR, WITH A REAL PDF</span>
                <Link href="/editor/">
                  See it for yourself{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          <section className="home-features" id="features">
            <div className="container home-features-grid">
              <div className="home-features-intro">
                <span className="home-kicker">BUILT FOR GETTING IT DONE</span>
                <h2>
                  All the right tools.
                  <br />
                  None of the detours.
                </h2>
                <p>
                  The everyday PDF tasks, together in one simple workspace. Open
                  a document and get straight to the part that matters.
                </p>
              </div>
              <div className="home-feature-list">
                {features.map((feature) => (
                  <div className="home-feature" key={feature.number}>
                    <span>{feature.number}</span>
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                    <ArrowUpRight
                      size={22}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="home-separate-tool" aria-labelledby="home-separate-title">
            <div className="container home-separate-tool-inner">
              <div>
                <span className="home-kicker">A SEPARATE PDF TOOL</span>
                <h2 id="home-separate-title">Only need a few pages?</h2>
                <p>Pick the pages you want and save them as a new PDF. It’s a focused tool of its own, separate from the PDF editor.</p>
              </div>
              <Link href="/extract-pdf-pages/" className="home-separate-tool-link">
                Extract pages from a PDF <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="home-privacy" id="privacy">
            <div className="container home-privacy-grid">
              <div className="home-privacy-art" aria-hidden="true">
                <div className="home-privacy-window">
                  <div className="home-privacy-window-top">
                    <span /> <span /> <span />
                    <small>your browser</small>
                  </div>
                  <div className="home-privacy-file">
                    <span className="home-privacy-file-fold" />
                    <span className="home-privacy-file-line" />
                    <span className="home-privacy-file-line short" />
                    <span className="home-privacy-file-sign">Alex Morgan</span>
                  </div>
                  <div className="home-privacy-lock">
                    <LockKeyhole size={18} strokeWidth={1.8} />
                  </div>
                </div>
              </div>
              <div className="home-privacy-copy">
                <span className="home-kicker">PRIVATE BY DESIGN</span>
                <h2>
                  Your document
                  <br />
                  stays yours.
                </h2>
                <p>
                  Your files and signatures stay in your browser while you work.
                  PDFetti doesn’t upload them to a server to make your edits.
                </p>
                <Link href="/privacy/" className="home-text-link">
                  How privacy works <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          <section className="home-closing">
            <div className="container home-closing-inner">
              <div>
                <span className="home-kicker">WHENEVER YOU'RE READY</span>
                <h2>
                  Make it official<span>.</span>
                </h2>
              </div>
              <Link href="/editor/" className="home-closing-action">
                Open the editor <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </main>
      </div>
      <footer className="home-footer">
        <div className="container home-footer-inner">
          <Brand />
          <span>Fill it. Sign it. Download it. No catches.</span>
          <nav aria-label="Footer">
            <Link href="/privacy/">Privacy</Link>
            <Link href="/editor/">Editor</Link>
            <Link href="/extract-pdf-pages/">Extract pages</Link>
            <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
