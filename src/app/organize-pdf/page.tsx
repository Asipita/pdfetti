import type { Metadata } from "next";
import { PageOrganizer } from "@/features/page-organization/page-organizer";

const pageUrl = "/organize-pdf/";
const description =
  "Organize PDF pages online for free. Reorder, rotate, or remove pages, then download a new PDF. Private, browser-based, and easy to use.";

export const metadata: Metadata = {
  title: "Organize PDF Pages Online for Free | PDFetti",
  description,
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    title: "Organize PDF Pages Online for Free | PDFetti",
    description,
    url: pageUrl,
  },
  twitter: { card: "summary", title: "Organize PDF Pages | PDFetti", description },
};

export default function OrganizePdfPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDFetti PDF Page Organizer",
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
      <PageOrganizer />
    </>
  );
}
