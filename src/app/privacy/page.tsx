import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
export const metadata: Metadata = {
  title: "Privacy",
  description: "How PDFetti keeps document editing local to your browser.",
  alternates: { canonical: "/privacy/" },
};
export default function Privacy() {
  return (
    <>
      <header className="marketing-nav">
        <div className="container nav-inner">
          <Brand />
          <Link href="/editor/" className="nav-action">
            Open editor
          </Link>
        </div>
      </header>
      <main className="container prose-page">
        <p className="section-kicker">Privacy</p>
        <h1>Your documents stay on your device.</h1>
        <p>
          PDFetti processes PDF files and signatures in your browser. The editor
          does not upload document contents to a PDFetti server, store them in
          an account, or send them to analytics.
        </p>
        <h2>What the editor stores</h2>
        <p>
          If you start from the homepage, the selected file is briefly held in
          your browser’s local IndexedDB so it can open in the editor. It is
          removed when the editor retrieves it. Edits live in memory during the
          current editing session. Your downloaded PDF is saved by your browser
          to your device.
        </p>
        <h2>What the website loads</h2>
        <p>
          The website loads its own code, fonts, and PDF rendering worker. There
          are no third-party analytics or advertising scripts in this version.
          You can review the source on{" "}
          <a className="prose-inline-link" href="https://github.com/asipita/pdfetti" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>.
        </p>
        <h2>Your control</h2>
        <p>
          Close the tab to end the editing session. If you leave the homepage
          before the editor opens, you can clear the temporary file by clearing
          this site’s browser data.
        </p>
        <p>
          <Link href="/" className="text-link">
            Back to PDFetti
          </Link>
        </p>
      </main>
    </>
  );
}
