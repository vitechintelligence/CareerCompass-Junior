import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/international"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/books"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/platform-development"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/vn"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/portal/student"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/portal/teacher"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/portal/partner"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/learn/unit-1?lang=en"), lastModified: now, changeFrequency: "weekly", priority: 0.65 },
  ];
}
