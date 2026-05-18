import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changeFreq: "weekly" as const },
  { path: "/what-we-write", priority: 0.9, changeFreq: "monthly" as const },
  { path: "/coverage", priority: 0.9, changeFreq: "monthly" as const },
  { path: "/how-it-works", priority: 0.9, changeFreq: "monthly" as const },
  { path: "/quote", priority: 0.9, changeFreq: "monthly" as const },
  { path: "/about", priority: 0.8, changeFreq: "monthly" as const },
  { path: "/contact", priority: 0.7, changeFreq: "monthly" as const },
  { path: "/insights", priority: 0.7, changeFreq: "weekly" as const },
  { path: "/privacy", priority: 0.2, changeFreq: "yearly" as const },
  { path: "/terms", priority: 0.2, changeFreq: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_ROUTES.map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));
}
