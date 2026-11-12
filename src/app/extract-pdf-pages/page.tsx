import type { Metadata } from "next";
import { PageSeparator } from "@/features/page-separation/page-separator";

const pageUrl = "/extract-pdf-pages/";
const description =
  "Extract pages from a PDF online for free. Select pages visually or enter page ranges, then download a new PDF. Private, browser-based, and easy to use.";

export const metadata: Metadata = {
  title: "Extract Pages from PDF for Free | PDFetti",
  description,
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    title: "Extract Pages from PDF for Free | PDFetti",
    description,
    url: pageUrl,
  },
  twitter: { card: "summary", title: "Extract Pages from PDF | PDFetti", description },
};

export default function ExtractPdfPagesPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDFetti PDF Page Separator",
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
      <PageSeparator />
    </>
  );
}
