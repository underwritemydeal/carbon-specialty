# Carbon Specialty — marketing site

Independent insurance brokerage specializing in real estate and apartment
building insurance across California and the Western United States.
Production marketing surface at **carbonspecialty.com**.

## Stack

- **Next.js 16 (App Router) + TypeScript** — server components for static
  chrome, client components only where interaction requires it
  (`Hero`, `CarbonChat`, `QuoteForm`, `CookieBanner`, `PostHogProvider`).
- **Vanilla CSS + design tokens** — no Tailwind. Tokens live in
  `src/styles/tokens.css` and reference next/font CSS variables.
- **next/font (self-hosted)** — IBM Plex Sans / Serif / Mono + Bodoni Moda.
- **PostHog** — same project as Covr AI so the funnel spans both products.
- **Resend** — fallback lead-email when the Covr Worker `/leads/inbound`
  endpoint isn't ready yet.
- **@vercel/og** — dynamic Open Graph image generator at `/api/og`.

## Dev

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

See `.env.example`. The two critical pairs:

1. **Covr Worker** — `NEXT_PUBLIC_COVR_API_URL` is the Cloudflare Worker
   that proxies Anthropic. The CarbonChat component POSTs
   `{ messages: [...] }` to `${COVR_API_URL}/v1/messages`. Same pattern
   Covr AI uses; no API key is exposed in the browser.
2. **Leads endpoint** — `NEXT_PUBLIC_LEADS_ENDPOINT` is where the chat
   transcript + extracted payload is POSTed when intake completes (and
   when the three-step form is submitted). Gate this with
   `NEXT_PUBLIC_LEADS_ENDPOINT_READY=true` once the Worker route is live.
   Until then the site uses `/api/lead-fallback` which sends an email via
   Resend.

## Build & deploy

```bash
npm run build
npm start
```

Connect the repo on Vercel. Production deploys from `main`, previews from
PR branches. After the first deploy:

- Add the env vars from `.env.example` to Vercel (Production + Preview).
- Point `carbonspecialty.com` at the Vercel project's DNS record.

## Project layout

```
src/
├─ app/
│  ├─ layout.tsx              # next/font, metadata defaults, PostHog
│  ├─ page.tsx                # /
│  ├─ what-we-write/page.tsx  # asset class deep dive
│  ├─ how-it-works/page.tsx   # AEO landing page for the AI quote tool
│  ├─ quote/page.tsx          # 3-step form
│  ├─ quote/sent/page.tsx     # confirmation
│  ├─ about/page.tsx          # founder bios with E-E-A-T signals
│  ├─ contact/page.tsx
│  ├─ insights/page.tsx       # MDX scaffold (empty at launch)
│  ├─ privacy/page.tsx        # CCPA template
│  ├─ terms/page.tsx          # template
│  ├─ not-found.tsx · error.tsx
│  ├─ sitemap.ts · robots.ts
│  ├─ llms.txt/route.ts       # llmstxt.org standard
│  └─ api/
│     ├─ og/route.tsx          # @vercel/og dynamic OG generator
│     └─ lead-fallback/route.ts# Resend email fallback
├─ components/                 # Wordmark, Header, Footer, Hero, CarbonChat …
├─ lib/                        # covr · intake-extractor · analytics · schema · site
└─ styles/tokens.css           # color · type · spacing · radii · motion
```

## AEO / SEO

The site is built to rank in both Google and the answer engines (ChatGPT,
Perplexity, Claude search, Google AI Overviews):

- Per-page `<title>` and meta description, no duplicates.
- Canonical URLs on every page.
- JSON-LD per page: InsuranceAgency, LocalBusiness, FAQPage on home;
  HowTo + WebApplication on `/how-it-works`; Service + OfferCatalog on
  `/quote`; ItemList on `/what-we-write`; Person on `/about`; Article on
  `/insights/[slug]`; BreadcrumbList everywhere.
- `/llms.txt` published per the llmstxt.org standard.
- `/api/og` dynamic OG images with the wordmark + page title.
- First-paragraph optimization with named entities (Carbon Specialty,
  real estate insurance, apartment buildings, California, Western United
  States, multifamily).
- Author bios on `/about` and per-article carry the E-E-A-T signals AEO
  needs: years of experience, specific asset classes, specific
  geographies.

## Brand discipline

- The wordmark is **CARBON** in Bodoni Moda spaced caps with **CA** in
  pine (`#1F4D38`) and **RBON** in ink (`#0B0B0C`), a hairline rule, and
  **SPECIALTY · INSURANCE** small caps below. Don't substitute fonts.
- One accent (pine), used sparingly. One per screen in most cases.
- No emoji. No gradients. No drop shadows. Sharp corners (max 4px).
- Lucide-style icons at 1.5px stroke. No filled icons. No icon stacks.

## Copy rules

- **No "since 2019"** anywhere — founding year is omitted across the site.
- **No license number** on the page (the agency holds licensure in 9
  states; the badge format is intentionally not displayed).
- **No AM Best rating displays** — carrier-side claims that would
  require separate compliance review.
- **Carrier panel** reads "60+ A-rated markets" — no individual carrier
  names; that's a deliberate counter-position to agencies that lead with
  logos.
- **Geographic language is Western US**, not California-only.
