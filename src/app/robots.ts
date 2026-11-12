export const dynamic = "force-static";
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://pdfetti.vercel.app";
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/editor/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
