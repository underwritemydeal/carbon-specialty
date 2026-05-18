# Carbon Specialty — Market & Cost Research

**Last updated: May 17, 2026 (verify before quoting in customer-facing contexts)**

This file captures the competitive landscape and cost models that informed Carbon's tech stack and positioning decisions. Use it as reference when the next chat needs to remember *why* a choice was made.

## Closest comparable: Steadily ChatGPT app (March 2026)

Steadily launched a ChatGPT app in March 2026 where landlords enter a property address and an underwriting engine pulls square footage, year built, and property characteristics, then returns an instant premium estimate.

Their compliance posture is explicit and embedded in every quote: "deal analysis only and does not accurately reflect the final quote you would receive." Useful precedent — it shows the regulatory frame for AI-driven indications is "facts + ranges + disclaimer," not "binding quote."

Steadily is a carrier-direct platform, not a brokerage. Carbon is a brokerage placing across many carriers. The UX pattern is similar but the value proposition is different: Steadily sells one Steadily policy, Carbon shops markets.

## Other players in the AI-insurance-intake space

- **Newfront** — Acquired by WTW January 2026. Internal AI build, not customer-facing.
- **Lemonade / Geico / Progressive** — Carrier-side AI (Lemonade's claims bot, Geico's Kate). Kate took roughly a decade to build. Not relevant as direct competition to Carbon; relevant as proof that carrier-side AI is mature while brokerage-side AI is wide open.
- **Perspective AI / TARS / Voiceflow** — Off-the-shelf chatbot vendors. Generic, no insurance-specific intelligence. Sub-grade compared to a focused build.
- **Neptune Flood / Tuio / Insurify** — ChatGPT app launches via OpenAI's MCP integration. Carrier-side or aggregator side.
- **Cape Analytics** — Acquired by Moody's January 2025. Enterprise-only contracts. Gold-standard COPE data for habitational risks, "Property Mapper" product for apartment complexes. Carbon should evaluate as a Phase 2 upgrade once volume justifies enterprise pricing. For now, Regrid + Google Places + Street View covers the basics.

## Compliance pattern (industry-wide as of Q1 2026)

The bot intakes FACTS and ROUTES. The bot never makes COVERAGE DETERMINATIONS or COMMITS the carrier. NAIC Model Bulletin on AI in insurance adopted in 26+ states. Brokers lag carriers by 18-24 months on customer-facing AI deployment — this is Carbon's window.

Hard handoff triggers (encoded in Carbon's system prompt as of Sprint C.S.1.7):
- "Am I covered?" / "Will you pay this claim?" — coverage interpretation, not factual
- Portfolios > $10M total insured value — too complex for AI intake
- Active loss in progress
- Litigation pending

Each trigger routes to a licensed specialist with no indication offered. The disclaimer pattern (three locked disclaimers per indication response, concatenated post-LLM-generation) is the Steadily template adapted to Carbon's brokerage frame.

## Anthropic pricing (verified May 2026)

For ongoing cost planning. Verify against https://docs.claude.com before making commercial commitments.

| Model | Input ($/M tokens) | Output ($/M tokens) | Cache reads | Cache writes |
|---|---|---|---|---|
| Haiku 4.5 | $1 | $5 | $0.10 | $1.25 |
| Sonnet 4.6 | $3 | $15 | $0.30 | $3.75 |
| Opus 4.7 | $5 | $25 | $0.50 | $6.25 |

- 50% batch discount available
- Prompt caching minimums: 1024 tokens (Haiku), 2048 tokens (Sonnet/Opus)
- Reusing cached prompt even twice saves money

**Carbon's chosen model**: Haiku 4.5. The intake task does not require the depth of Sonnet or Opus — it requires fast, accurate, factual capture with tool calling. Haiku handles this well at one-third to one-fifth the cost. If quality issues emerge with rate-band YAML interpretation, escalate to Sonnet 4.6 — but start with Haiku.

## Property data API landscape

Current pipeline (sprint C.S.1.7.0a):

```
geocoding (Google) → if CA + county in registry → county-direct ArcGIS
                  → else / on null              → Realie Address Lookup
                  → (streetview always)
```

| Provider | Coverage | Pricing | Carbon's verdict |
|---|---|---|---|
| **CA county-direct (ArcGIS REST)** | Per-county. LA County wired in C.S.1.7.0a. Pattern is a generic `arcgis-client.ts` + per-county field registry (`ca-county-registry.ts`); subsequent sprints add Orange, San Diego, Riverside, etc. | Free (public-records data) | **Selected for CA Phase 1.** Direct integration avoids the third-party-aggregator coverage gaps that bit Carbon on Regrid (C.S.1.6.6/7) and Realie (C.S.1.6.8). Surfaces richer building specs (LA publishes up to 5 sub-buildings per parcel, bedrooms/bathrooms, design + quality class, parcel-polygon-derived lot area). |
| **Realie.ai** | Nationwide US property data | Free tier 25 req/month + $0.15/overage | **Selected as the non-CA + CA-fallback path** (C.S.1.6.8). Address Lookup endpoint. Returns thin shape for most CA addresses, which is why CA routes to county-direct first. |
| **Google Geocoding API** | Worldwide addresses + lat/lng + structured address components | $5 per 1k geocodes after free tier | **Selected** — primary geocoder. The structured `address_components` parsing (street_number, route, locality, county, state) is what enables both Realie's required-field URL shape and the county-direct routing in C.S.1.7.0a. |
| **Google Places API** | Address autocomplete, POI data | Free tier generous | **Selected** for chat input autocomplete. |
| **Google Street View Static** | Address-to-image URL composer | Free tier | **Selected** for visual confirmation in chat responses. |
| ~~Regrid~~ | Nationwide US parcels | Regrid Self-Serve starts ~$500/month | **Replaced by Realie in C.S.1.6.8.** Self-serve tier didn't fit Carbon's ~25–200 quotes/month early-stage volume. Code path deleted; Realie's response shape covers the same PropertyFacts fields. |
| ATTOM / CoreLogic / DataTree / FirstAmerican / LightBox | Nationwide property data **including owner name + mailing address** | Enterprise contracts | **Deferred but on the roadmap.** Required for the marketing-export use case Carbon eventually needs — CA counties (LA confirmed) do NOT publish owner name or mailing address via public ArcGIS by policy. The C.S.1.7.0a registry shape already models `owner` fields (mostly `undefined` for CA) so a future sprint can wire one of these sources in without reshaping `PropertyFacts`. |
| PropertyShark | US property + owner + skip-trace | Per-record pricing | Same category as ATTOM/CoreLogic — candidate for owner-data sprint. |
| First Street | Climate risk per property | Contact-for-pricing | **Deferred to Phase 3.** |
| Cape Analytics | COPE data + apartment Property Mapper | Enterprise contracts only | **Deferred to Phase 3** — upgrade target once placement volume justifies. |

**Owner-data gap (important):** CA counties' public ArcGIS endpoints don't publish owner name or mailing address. LA County confirmed via direct probe (87 fields surfaced; zero owner fields). This is a privacy-driven policy choice — owner data is only accessible via the assessor's per-parcel captcha-protected portal. Carbon's chat enrichment doesn't need it (chat uses building specs to lead the asset-type confirmation); the marketing-export use case requires a separate source (see ATTOM/PropertyShark/LightBox row).

## Per-conversation cost model (Carbon's chat as of C.S.1.6)

- LLM cost: $0.05-0.15 per chat (Haiku 4.5, prompt cached on system block)
- Enrichment cost: $0.01-0.03 per address lookup (Google Geocoding + Regrid + Street View)
- Total per chat: ~$0.15-0.30, drops toward $0.10 with cache hits
- 100 chats/month → $15-30 total
- 1,000 chats/month → $150-300 total

This cost model assumes mostly successful enrichments and ~5-message average conversation length. Edge cases (failed enrichments retrying, very long conversations) push higher but stay well under $1/chat.

## Tooling decisions and their reasoning

**Why Next.js 16 (not Astro, not plain React)**: App Router gives Carbon dynamic SSR for the marketing pages with edge runtime support, and the same codebase serves the `/api/*` routes that proxy Anthropic and Google. Vercel hosts both seamlessly. Astro was considered for the marketing pages but Carbon needs API routes that can call Anthropic, and a Next.js setup avoids splitting infrastructure.

**Why no Tailwind**: Tailwind's utility-first defaults push toward a generic SaaS aesthetic that conflicts with Carbon's editorial brand frame. Custom CSS modules with design tokens give the team precise control over a small surface area. The tradeoff (slightly more CSS to write) is worth the brand discipline.

**Why Anthropic (not OpenAI, not Gemini)**: Tool calling reliability, prompt caching cost discount, and Claude's tone alignment with editorial brands. The Carbon system prompt is verbose and editorial — Claude renders it more accurately than GPT-4o or Gemini 2.5 in the tests Robby ran. Pricing parity with OpenAI on Haiku tier removes the cost objection.

**Why NowCerts (AMS)**: API access, modern data model, REST endpoints. EZLynx and Applied Epic were rejected for closed-system constraints (Carbon needs to programmatically push intake submissions into the AMS, which requires open APIs).

**Why PIIB (cluster)**: PIIB covers the nine Western states Carbon targets in Phase 1, has reasonable commission splits, and accepts AI-native brokerage models. SIAA was the alternative considered but PIIB's Western US density won.

**Why Distinguished + Honeycomb (wholesale)**: Both have strong real estate / habitational appetite, both have published rate appetites that map cleanly to Carbon's intake fields. Most other E&S wholesalers require deeper appointment processes than Carbon needs for Phase 1.

**Why Vercel (not Cloudflare Pages, not Netlify)**: Tightest integration with Next.js (same team), generous free tier, edge runtime support, MCP server availability for autonomous Claude Code deploys. Cloudflare Pages was considered (Robby uses Cloudflare Workers for other projects) but Vercel's Next.js DX edge is meaningful for Carbon's velocity.

**Why Resend (not Postmark, not SendGrid)**: Modern API, easy domain setup with DKIM/SPF/DMARC automated, generous free tier. Postmark is the close second and could be a future migration if deliverability becomes a concern.

## Things to verify before customer-facing claims

- Steadily ChatGPT app launch date (March 2026 per current sources, verify before citing)
- Newfront / WTW acquisition close date (January 2026)
- Cape Analytics / Moody's acquisition close (January 2025)
- NAIC Model Bulletin adoption count (26+ states as of Q1 2026 — moving target)
- Anthropic pricing — verify against docs.claude.com before quoting in any commercial commitment
- Regrid free tier limits and paid tier pricing — verify against regrid.com

Use web_search for any of these if asked to cite in a customer document or competitive deck.
