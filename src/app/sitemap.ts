export const dynamic = "force-static";
import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://pdfetti.example";
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/privacy/`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
