import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "../styles/site.css";
import "../styles/marketing.css";
import "../styles/page-separation.css";
import "../styles/page-organization.css";
import "../styles/pdf-merge.css";
import "../styles/document-fonts.css";
const inter = localFont({
  src: [
    { path: "../fonts/Inter-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/Inter-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/Inter-SemiBold.otf", weight: "600", style: "normal" },
    { path: "../fonts/Inter-Bold.otf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-inter",
});
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://pdfetti.vercel.app";
const ogImage = new URL("/og.png", site).toString();
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "PDFetti — Fill, sign, and download PDFs for free",
    template: "%s | PDFetti",
  },
  description:
    "Annotate, extract pages, organize, and merge PDFs with free, private tools that run in your browser.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PDFetti",
    title: "PDFetti — PDFs without the fuss",
    description:
      "Annotate, extract pages, organize, and merge PDFs in your browser. Free, private, and no account needed.",
    url: "/",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "PDFetti PDF tools: annotation, page extraction, page organization, and PDF merging",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFetti — PDFs without the fuss",
    description:
      "Annotate, extract pages, organize, and merge PDFs in your browser. Free, private, and no account needed.",
    images: [ogImage],
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
