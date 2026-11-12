import type { Metadata } from "next";
import { PdfMerger } from "@/features/pdf-merge/pdf-merger";

const pageUrl = "/merge-pdf/";
const description =
  "Merge PDF files online for free. Add PDFs, arrange their order, and download one combined document. Private, browser-based, and easy to use.";

export const metadata: Metadata = {
  title: "Merge PDF Files Online for Free | PDFetti",
  description,
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    title: "Merge PDF Files Online for Free | PDFetti",
    description,
    url: pageUrl,
  },
  twitter: { card: "summary", title: "Merge PDF Files | PDFetti", description },
};

export default function MergePdfPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDFetti PDF Merger",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    description,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://pdfetti.vercel.app"}${pageUrl}`,
    isPartOf: { "@type": "WebSite", name: "PDFetti" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PdfMerger />
    </>
  );
}
