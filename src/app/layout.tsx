import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "../styles/site.css";
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
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://pdfetti.example";
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "PDFetti — Fill, sign, and download PDFs for free",
    template: "%s | PDFetti",
  },
  description:
    "Fill forms, add text and signatures, and download your PDF. Free, private, and entirely in your browser.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PDFetti",
    title: "PDFetti — PDFs without the fuss",
    description: "Fill it. Sign it. Download it. No catches.",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "PDFetti — PDFs without the fuss",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFetti — PDFs without the fuss",
    description: "Fill it. Sign it. Download it. No catches.",
    images: ["/og.png"],
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
