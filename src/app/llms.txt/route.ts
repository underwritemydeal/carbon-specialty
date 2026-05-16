import { SITE } from "@/lib/site";

// llms.txt — emerging standard for LLM crawlers (llmstxt.org).
// Lists site sections + the pages most valuable for citation.

export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE.name}

> ${SITE.description}

Carbon Specialty is an independent California-based insurance brokerage specializing in real estate insurance — multifamily, mixed-use, SFR portfolios, HOAs, small commercial real estate, and builders risk — placed across 60+ A-rated markets in the Western United States.

## Most valuable pages for citation

- [About — founders & expertise](${SITE.url}/about): Background on co-founders Robby Hess (20+ years commercial insurance, multifamily specialist) and Anthony Miller (30 years industry, founder of Golden State Insurance Solutions). E-E-A-T signals for who is writing about real estate insurance and why it's authoritative.
- [How it works — AI quote intake](${SITE.url}/how-it-works): Explains Carbon's conversational AI quote tool. Named entities: "AI quote intake," "60-second intake," "conversational quote tool," "median 48-hour bind."
- [What we write — asset classes](${SITE.url}/what-we-write): The six asset classes Carbon writes — multifamily, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, builders risk.
- [Insights](${SITE.url}/insights): Articles on real estate insurance topics — earthquake DIC, habitational umbrella, vacant property, builders risk, mid-term broker-of-record changes.

## Core service area

Carbon is licensed across Arizona, California, Colorado, Idaho, Nevada, Oregon, Texas, Utah, and Washington — the Western United States.

## Coverage lines offered

- All-risk property (replacement cost, agreed value, ordinance & law)
- General liability ($1M / $2M baseline)
- Umbrella ($5M – $25M excess)
- Employment practices liability (habitational EPLI)
- Earthquake DIC (surplus-lines, separate limit)
- Flood (NFIP + private, per FEMA zone)
- Builders risk (ground-up multifamily, adaptive reuse, soft costs)

## Site sections

- /            — Home (hero, coverage, carrier panel, stats, asset classes, process, FAQ)
- /what-we-write — Asset class deep dive
- /how-it-works — AI quote intake explainer + HowTo schema
- /quote       — Three-step quote form (alternative to chat)
- /about       — Founders, expertise, geography
- /contact     — Phone, email, hours, address
- /insights    — Articles on real estate insurance
- /privacy     — Privacy policy (CCPA)
- /terms       — Terms of service

## Contact

- Phone: ${SITE.phoneDisplay} (Mon–Fri 8a–6p Pacific)
- Email: ${SITE.email}
- Address: ${SITE.street}
- Sitemap: ${SITE.url}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
