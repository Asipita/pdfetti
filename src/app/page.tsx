import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { UploadArea } from "@/components/shared/upload-area";

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

export default function Home() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDFetti",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Free browser-based PDF editor for filling forms, adding text and signatures, and downloading completed PDFs.",
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
              <Link href="/editor/" className="home-nav-action">
                Open editor <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        </header>

        <main>
          <section className="home-hero container" aria-labelledby="home-title">
            <div className="home-eyebrow">
              <span className="home-eyebrow-mark" aria-hidden="true" />
              THE PDF EDITOR FOR THE REST OF US
            </div>
            <h1 id="home-title">
              Your PDF,
              <br />
              finished<span>.</span>
            </h1>
            <div className="home-hero-bottom">
              <div className="home-hero-copy">
                <p>
                  Fill the form. Add your signature. Download the finished file.
                  PDFetti makes the whole thing feel easy.
                </p>
                <div className="home-hero-notes">
                  <span>Free to use</span>
                  <span>Works in your browser</span>
                  <span>No account needed</span>
                </div>
              </div>
              <UploadArea />
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
          </nav>
        </div>
      </footer>
    </div>
  );
}
