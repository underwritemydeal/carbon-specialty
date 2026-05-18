# Carbon Specialty — Tech Stack & Current State

**Last updated: May 17, 2026**

## Repository

- GitHub: `underwritemydeal/carbon-specialty` (public)
- Default branch: `main`
- Local checkout location: nested inside the mycovrai code dir under a path that contains Windows-style separators — Robby has noted this is messy but functional, and a future cleanup will `mv` it to `~/code/carbon-specialty/`. Don't recommend the rename unless he brings it up.

## Framework & language

- Next.js 16 (App Router, not Pages)
- TypeScript
- No Tailwind. Custom CSS modules with design tokens defined in `globals.css` and per-component `.module.css` files. The styling system is intentional — Tailwind was considered and rejected because it pushes toward a utility-first aesthetic that conflicts with Carbon's editorial brand discipline.

## Hosting & deploy

- Vercel project: `carbon-specialty` under the `underwrite-my-deals-projects` team
- Auto-deploys: every push to `main` triggers Production. Every PR triggers a Preview deployment with a unique URL.
- Production URL: https://carbonspecialty.com (apex-canonical), https://www.carbonspecialty.com 308-redirects to apex
- Backup Vercel URL: https://carbon-specialty.vercel.app (also connected to Production)
- Registrar: Namecheap. DNS configured with A record `@ → 216.150.1.1` and project-specific CNAME `www → <hash>.vercel-dns-016.com.` (Vercel's current routing pattern as of 2026)

## Environment variables (set on Production + Preview)

- `ANTHROPIC_API_KEY` — for the /api/chat route (Anthropic Messages API)
- `GOOGLE_MAPS_API_KEY` — server-side key, restricted to Geocoding API + Places API + Street View Static API, no application restrictions
- `REGRID_API_TOKEN` — parcel data lookups
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` — client-side key for Places Autocomplete on the chat input (added in Sprint C.S.1.6.1)
- `NEXT_PUBLIC_LEADS_ENDPOINT_READY` — feature flag for the /api/lead-fallback path (Resend integration)
- Possibly: `RESEND_API_KEY` — if Robby has configured email yet; check Vercel dashboard

## Pre-launch lockdown (intentional, still active)

- `<meta name="robots" content="noindex, nofollow">` site-wide via `metadata.robots` in the root layout
- `/robots.txt` returns `Disallow: /`
- All fabricated stats removed from marketing copy
- Phone/email placeholders normalized — no real contact info until launch
- "Powered by Covr" references removed (Carbon must read as Carbon, not as a Covr derivative)
- The lockdown stays in place until **Sprint C.S.1.flip** (planned, not yet scoped). That sprint flips noindex off, swaps real contact info in, submits sitemap to Google Search Console + Bing, and announces launch.

## Routes (current)

### Pages (App Router)

Thirteen page routes. Primary nav order (matches `Header.tsx`, `Hero.tsx` masthead, and `Footer.tsx` services): What we write → Coverage → How it works → About → Insights → Contact.

- `/` — home (Hero + HeroLede + condensed Coverage umbrellas + Position + Asset classes + Carrier bar + Process + FAQ + Footer)
- `/what-we-write` — six asset classes Carbon places: multifamily, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, builders risk. (This is the "Programs" page in casual reference; the live label across all nav surfaces is **What we write**.)
- `/coverage` — twelve-chapter editorial reference for the full coverage menu (sprint C.S.1.6.3). Property, GL, Umbrella & Excess, Workers' Comp, EPLI, D&O, E&O, Cyber, Crime & Fidelity, Pollution Legal Liability, Hired & Non-Owned Auto, Equipment Breakdown. Magazine layout with per-chapter `NN / 12` pagination. Closes with an end-of-page `AskCarbonStrip` (paper, hairline ink rule above, "Ask Carbon →" link) that opens the chat.
- `/how-it-works` — process walkthrough
- `/about` — agency / founder context
- `/insights` — editorial index
- `/contact` — contact page (also the mobile hamburger destination on the hero — hamburger is a single link, not a real overlay menu)
- `/quote` + `/quote/sent` — standard three-step quote form path (alternative to the chat)
- `/privacy`, `/terms` — legal

### API routes

- `POST /api/chat` — Anthropic Messages API proxy. Uses `claude-haiku-4-5-20251001` with prompt caching on the system block. Server-side tool-use loop, capped at 5 iterations. Modes: `intake` (default) and `extract` (used for structured field extraction at end of conversation). Tool registry includes `enrich_property`. Error categories logged with `[carbon-chat]` prefix: auth | rate-limit | server | network | bad-shape | tool-fail.
- `POST /api/property/enrich` — Google Geocoding + Regrid + Street View URL composer. 30-day edge cache via `{ next: { revalidate: 2592000 } }`. Partial-failure semantics — returns `sources_succeeded` and `sources_failed` arrays. 502 only when every source fails. Missing env keys degrade gracefully (returns what it can).
- `POST /api/tts` — Inworld TTS (sprint C.S.1.6.2). `Authorization: Basic ${INWORLD_API_KEY}`, model `inworld-tts-1.5-mini`, voice `Reed`. Returns `audio/mpeg` (MP3, 24 kHz, 64 kbps). Per-IP rate-limit 30 calls / 10 min. Missing key → 503 `NO_KEY` (chat stays usable; voice surfaces silently no-op). Full details in *Anthropic API usage details → Voice (Inworld TTS)* below.
- `POST /api/lead-fallback` — Resend integration for non-chat lead submissions (the secondary "standard quote form" path). Gated behind `NEXT_PUBLIC_LEADS_ENDPOINT_READY` flag.
- `GET /api/og` — dynamic Open Graph image generator for social shares
- `/llms.txt`, `/sitemap.xml`, `/robots.txt` — AEO foundation files (sitemap currently suppressed by pre-launch lockdown)

## Key source files (intake chat stack)

- `src/components/CarbonChat.tsx` — the chat slide-out component. Renders the textarea, message list, status line ("Looking up property…" when address-y input detected). Wires Google Places Autocomplete to the textarea (Sprint C.S.1.6.1).
- `src/lib/carbon-system-prompt.ts` — the editorial-professional intake prompt. Defines tone, intake sequence, wrap-up sentinel string `"I have what a specialist needs to start."`, and tool-use instructions for `enrich_property`.
- `src/lib/carbon-intake.ts` — client-side intake state machine. Exports `CarbonIntakePayload` type, `generateReferenceId()` (returns `CS-YYYY-XXXX` format), `ChatError` discriminated union with kinds: auth | rate-limit | server | network | bad-shape | tool-fail. Functions: `askCarbonIntake`, `extractIntakePayload`, `submitIntake`, `callChat`.
- `src/lib/property-facts.ts` — defines `PropertyFacts` interface (the canonical shape of enrichment output).
- `src/lib/chat-tools.ts` — the `TOOLS` array and `executeTool` dispatcher. `enrich_property` is registered here.
- `src/styles/globals.css` — design tokens (CSS variables for colors, type scale, spacing, motion durations) and base reset.

## Critical workflow files

- `AGENTS.md` (repo root) — defines the deploy-safety confirmation gate. When Claude Code runs `vercel deploy --prod`, the agent must surface this prompt and wait for "yes proceed" from Robby. This is non-negotiable.
- `CARBON_SPECIALTY_BRAND.md` (repo root, also in Claude Project knowledge) — the design system canonical reference.

## What's wired end-to-end and working

- Address typed in chat → submitted → `/api/chat` → Claude Haiku 4.5 → tool call `enrich_property` → `/api/property/enrich` → Google Geocoding + Regrid + Street View → response with property facts → Claude resumes conversation with the facts → user sees confirmation in chat.
- Google Places Autocomplete on the chat input field (Sprint C.S.1.6.1 — verify status if questioned).
- Resend transactional email via `/api/lead-fallback` (gated behind feature flag).
- Pre-launch lockdown (noindex + robots.txt Disallow).

## What's NOT wired

- Rate-band YAML appendix in the system prompt — Carbon currently can't produce indications. It captures facts and hands off. The rate-band work is **Sprint C.S.1.7** (planned, not started).
- PostHog instrumentation of the chat funnel (event capture, conversion tracking) — **Sprint C.S.1.8**.
- Production email at `hello@carbonspecialty.com` — requires Resend domain setup with DKIM/SPF/DMARC. Inbound parsing (forwarding to a real inbox) is a separate Resend or Postmark setup. **Sprint C.S.2-range**.
- Cape Analytics Property Mapper upgrade — deferred to **Sprint C.S.3.0**, only justified once placement volume warrants the cost.
- Real contact information across the site (currently placeholder).

## Anthropic API usage details

- Model: `claude-haiku-4-5-20251001`
- System block uses prompt caching (1024-token minimum on Haiku, easily met by the current system prompt + intake instructions)
- Cost target: ~$0.15-0.30 per chat including LLM and enrichment costs; drops toward $0.10 with cache hits. 100 chats/month → $15-30 total.
- Per-conversation cap not currently enforced. Add if abuse patterns emerge.
- Errors caught in 6 categories and logged with `[carbon-chat]` prefix in Vercel runtime logs.

### Voice (Inworld TTS) — sprint C.S.1.6.2

Carbon's chat replies can be spoken aloud. Two triggers:

1. **Auto-play** on assistant turns that replied to a voice-initiated user turn (the user tapped the mic in `CarbonChat.tsx` to dictate).
2. **Manual** via a "LISTEN →" affordance below every Carbon message in a text-initiated session. Tap-to-play; one playback at a time, new plays preempt the previous.

The Inworld client lives in **`src/lib/inworld-tts.ts`** and is consumed only by **`src/app/api/tts/route.ts`** (POST `{ text, voice? }` → `audio/mpeg` binary). The browser-side player lives in **`src/lib/voice-client.ts`** as `playTTS()` / `stopTTS()`.

| Field | Value |
| --- | --- |
| Endpoint | `POST https://api.inworld.ai/tts/v1/voice` |
| Auth header | `Authorization: Basic ${INWORLD_API_KEY}` (key is already base64-encoded `client_id:client_secret`) |
| Model | `inworld-tts-1.5-mini` (operator-selected; cheap + fast for chat-length replies) |
| Voice | `Reed` (operator-selected default; per-request override via `voice` param) |
| Audio out | MP3, 24 kHz, 64 kbps |
| Env var | `INWORLD_API_KEY` |
| Max text per call | 1500 chars (`INWORLD_MAX_TEXT_CHARS`); longer input is truncated on a sentence boundary |
| Wrap-up sentinel | The intake sentinel ("I have what a specialist needs to start.") is stripped before synthesis so it never plays aloud |

**Rate limiting.** `/api/tts` enforces an in-memory per-IP cap of **30 calls per 10 min** (`RATE_WINDOW_MS=10*60*1000`, `RATE_MAX=30` in `src/app/api/tts/route.ts`). Per-Fluid-Compute-instance only — not a global rate limit. Sufficient as an abuse brake; not a billing guarantee. The model is selected for low cost-per-character to keep the worst case bounded.

**Pipeline location.** Auto-play fires from a `useEffect` in `CarbonChat.tsx` that watches the `messages` array, checks `voiceTurnsRef` for membership of the last index, and calls `playTTS()` exactly once per assistant message (`autoPlayedRef` dedupe). Manual playback fires from the "LISTEN →" button's `onClick` and toggles a `manualPlaying` state so the affordance reads "Playing…" in pine while audio is in flight.

**Graceful degradation.**

| State | Behavior |
| --- | --- |
| `INWORLD_API_KEY` missing | `/api/tts` returns 503 `NO_KEY`. Chat stays fully usable; LISTEN affordance and auto-play silently no-op (logs warning). |
| Inworld 401/403 | 503 `INWORLD_AUTH`. Same client behavior. |
| Inworld 429 or local rate-limit | 429 `RATE_LIMIT`. Client logs and skips. |
| Inworld 5xx / network | 502 `INWORLD_UPSTREAM`. Client logs and skips. |
| iOS Chrome (no `webkitSpeechRecognition`) | Mic button hidden. Mono caption renders: `VOICE INPUT — SAFARI OR CHROME DESKTOP`. TTS playback still works on manual tap (LISTEN buttons render). |

**Cost shape.** At Inworld's published TTS-1.5 Mini pricing tier, a typical 60-char Carbon reply is fractions of a cent; a worst-case wrap-up message (~1500 chars) is still well under a cent. Total exposure scales with chat volume × autoplay rate; the per-IP cap blunts adversarial loops.

**Future migration note.** The current implementation owns its own /api route. If Carbon adopts an audio-streaming UI (e.g., partial playback while the model is still generating), the streaming endpoint (`POST https://api.inworld.ai/tts/v1/voice:stream`, NDJSON) is the swap target. The client surface (`playTTS`) was kept narrow so that change wouldn't touch `CarbonChat.tsx`.

## Google Cloud project

- Project name: `carbon-specialty`
- Project ID: `carbon-specialty`
- Project number: 235533689250
- Free trial: $300 credit, expires ~late July 2026
- APIs enabled: Geocoding API, Places API (classic, NOT "New"), Street View Static API
- Keys provisioned:
  - `carbon-specialty-maps` — server-side, restricted to 3 APIs, no application restrictions. Used by `/api/property/enrich`.
  - (Optional, if C.S.1.6.1 chose the two-key path) `carbon-specialty-places-public` — client-side, restricted to Places API only, HTTP referrer restrictions to `carbonspecialty.com/*` and `*.vercel.app/*`. Used by Places Autocomplete on the chat input.

## Tools used in active development

- Claude Code v2.1.81+ with `claude --dangerously-skip-permissions` flag for autonomous sprints
- Warp terminal (macOS) for shell sessions
- Vercel MCP (env vars, deploys, log inspection)
- PostHog MCP (will be active once C.S.1.8 ships)
- 21st.dev Magic MCP and Stitch MCP for design-adjacent component generation
- OpenArt for hero video and stills (Seedance 2.0 image-to-video, Flux Pro for stills)
- `/mnt/skills/public/frontend-design/SKILL.md` — referenced before any new component or CSS work

## Conventions for Claude Code prompts

- Strip verification scaffolding. No "use Playwright MCP" steps. No halt-and-report clauses. No multi-anchor manual verification.
- One PR per sprint. No chained-PR patterns.
- Auto-merge per 4-criteria gate: Vercel preview green + CI green + agent self-verification + no operator-decision content.
- Production deploys require explicit "yes proceed" via AGENTS.md.
- Test/Playwright sprints ship separately AFTER a feature is on production, not bundled in.

## Conventions for adding features

- Restraint at component level (no rounded > 4px, no shadows, no gradients except hero overlays).
- Drama at layout level (full-bleed video, XL typography, asymmetric composition).
- No customer-facing references to Covr AI anywhere.
- B&W photography only. No color photos.
- Carbon's three colors only: ink #0B0B0C, paper #F5F2EC, pine #1F4D38. Ember #C45A2E is reserved for accent moments (link hover, status pulse) — use sparingly.
