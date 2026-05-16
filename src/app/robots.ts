import type { MetadataRoute } from "next";

// Pre-launch lockdown — see /AGENTS.md "Deploy safety" + sprint C.S.1.1.
// Restore the per-rule allow + sitemap reference when content is verified
// for launch.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
