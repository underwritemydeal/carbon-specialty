# Carbon Specialty — Sprint Roadmap

**Last updated: May 17, 2026**

Carbon ships in numbered sprints under the C.S.* prefix (Carbon Specialty). Each sprint = one PR, one feature, one focused outcome. Test sprints ship separately AFTER a feature is on production.

## Shipped (in order)

### C.S.1 — Foundation (commit 8549218)
Next.js 16 App Router + TypeScript scaffold. No Tailwind — custom CSS modules + design tokens. 12 routes. AEO foundation files: `/llms.txt`, `/sitemap.xml`, `/robots.txt`. Dynamic `/api/og` for social images. `/api/lead-fallback` route stub with Resend integration. PostHog provider registered (not yet instrumented). CCPA banner. Site live at https://carbon-specialty.vercel.app/ (now also https://carbonspecialty.com).

### C.S.1.1 — Pre-launch lockdown
Added `<meta name="robots" content="noindex, nofollow">` via root layout metadata. Removed fabricated stats from copy. Normalized phone/email placeholders. Removed "Powered by Covr" references. `/robots.txt` returns Disallow. This lockdown is still active and stays until C.S.1.flip.

### C.S.1.2-1.3 — Visual confidence pass + hero rebuild
12-col grid, drop-cap, page-number, marginalia, paper-grain. Motion provider + scroll-reveal primitive. Hero: contained video plate, masthead with pulsing dot, pull-quote in Section 03, card hover with L→R ink fill. Hero video uses Seedance 2.0 image-to-video with an operator-supplied Painted Ladies photo, B&W. Saved at `public/videos/hero-painted-ladies.mp4`.

### C.S.1.4 — Chat infrastructure scaffold (PR #4 commit c68dd10)
- `carbon-system-prompt.ts` with editorial-professional intake prompt and wrap-up sentinel `"I have what a specialist needs to start."`
- `carbon-intake.ts` exporting `CarbonIntakePayload`, `generateReferenceId()` (CS-YYYY-XXXX format), `ChatError` discriminated union (auth | rate-limit | server | network | bad-shape | tool-fail), and the `askCarbonIntake` + `extractIntakePayload` + `submitIntake` functions.
- `/api/lead-fallback` wired with Resend, gated behind `NEXT_PUBLIC_LEADS_ENDPOINT_READY` flag.

### C.S.1.5 — Full-bleed hero video (PR #5 commit d117b98)
Hero plate now 85vh / 75vh / 60vh on desktop / tablet / mobile. Wordmark `.overVideo` variant — "CA" and "RBON" in paper, "RB" in pine. HeroLede paper-base section sits below the hero.

### C.S.1.5.1-1.5.2 — Hero overlay + wordmark fixes
Pine-on-video gradient strengthening: top to 92% ink, bottom to 95% ink, italic "home." text-shadow, CA span text-shadow. Wordmark underline anchored under "RB" letters consistently across all variants.

### C.S.1.6 — Property enrichment + Next.js chat replacement (PR #9 commit 5518eb0)
The substantive infrastructure sprint. 13 files, +1604 / -159 lines.

- `/api/property/enrich` (POST) — Google Geocoding + Regrid + Street View URL composer. 30-day edge cache via `{ next: { revalidate: 2592000 } }`. Partial-failure semantics with `sources_succeeded` / `sources_failed`. 502 only when every source fails. Graceful degradation on missing env keys.
- `/api/chat` (POST) — Anthropic Messages API (claude-haiku-4-5-20251001), prompt caching on system block, server-side tool-use loop capped at 5, `enrich_property` tool registered. `mode: "intake" | "extract"` switches system prompt + tool registry. Errors logged with 6 categories under `[carbon-chat]` prefix.
- `src/lib/property-facts.ts` (PropertyFacts interface), `src/lib/chat-tools.ts` (TOOLS array + executeTool dispatcher).
- `carbon-intake.ts` updated: `WorkerError` → `ChatError` (alias kept), `callWorker` → `callChat` pointing to `/api/chat`. The previous Worker proxy is bypassed entirely for Carbon.
- `CarbonChat.tsx` shows subtle "Looking up property…" mono status line when message looks address-y. Retry/fallthrough preserved.
- `carbon-system-prompt.ts` — single new sentence instructing model to call `enrich_property` on any property address.
- Vitest installed, 7/7 tests green.

### Production deploy (May 17, 2026)
- Deployment ID: `dpl_4ays6Ev4DzznEH8PyTiXeopKsYEz`
- Commit: `5518eb0` (Sprint C.S.1.6)
- Domain: carbonspecialty.com (apex-canonical) + www.carbonspecialty.com (308 redirect) + carbon-specialty.vercel.app
- Env vars set: ANTHROPIC_API_KEY, GOOGLE_MAPS_API_KEY, REGRID_API_TOKEN on Production + Preview
- DNS: Namecheap A record + Vercel project-specific CNAME

### C.S.1.6.1 — Google Places Autocomplete on chat input (in flight as of May 17)
Adds typeahead address suggestions to the CarbonChat textarea. Wires `google.maps.places.Autocomplete` (browser API) to the input. Suggestions limited to `types: ['address']` and `componentRestrictions: { country: 'us' }`. Selection fills the textarea without auto-submitting. Autocomplete is only enabled on the FIRST user message (intake address capture) — disabled after the first send so it doesn't interfere with follow-up replies like "yes" or "multifamily." Dropdown styled via `.pac-container` CSS override to match Carbon's design tokens.

API key: reuses `GOOGLE_MAPS_API_KEY` exposed client-side as `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`. The two-key hygiene pattern (separate referrer-restricted client key) was considered and deferred — single-key reuse was the chosen path for speed.

### C.S.1.6.2 — Inworld TTS wiring + voice UX + mobile polish
Adds Carbon's first voice surface and a mobile masthead/typography polish pass. One PR, three deliverables.

- **Inworld TTS integration.** New `/api/tts` route (Node runtime, `maxDuration` 30s) calls `POST https://api.inworld.ai/tts/v1/voice` with `Authorization: Basic ${INWORLD_API_KEY}` (key is the already-base64-encoded `client_id:client_secret`). Model: `inworld-tts-1-5-mini`. Voice: `Reed`. Audio out: MP3, 24 kHz, 64 kbps streamed back as `audio/mpeg` binary. Client surface in `src/lib/voice-client.ts` (`playTTS` / `stopTTS`). Wrap-up sentinel scrubbed before synthesis. In-memory rate limit of 30 calls per 10 min per IP. Graceful degradation: missing `INWORLD_API_KEY` → 503 `NO_KEY`, chat stays fully usable, voice surfaces silently no-op. Full details in `CARBON_TECH.md` → *Voice (Inworld TTS)*.
- **Voice UX in CarbonChat.** Mic button right side of the chat input (before the send arrow). Web Speech API STT, continuous + interim results; interim transcript renders over the textarea at opacity 0.6 via a mirror-div overlay. Feature-detect on mount: if unsupported (primarily iOS Chrome), the mic button is hidden and a mono caption renders "VOICE INPUT — SAFARI OR CHROME DESKTOP." Voice-initiated user turns are tracked in a ref-Set; Carbon's reply to a voice turn auto-plays once (`autoPlayedRef` dedupe). Text-initiated Carbon messages render a "LISTEN →" affordance that plays on tap (pine while in flight). No autoplay on text-initiated sessions — iOS blocks it.
- **Mobile polish at ≤480px.** Masthead row tightens (eyebrow `padding-top`/`margin-top` halved, status-line gap dropped from 6px → 3px). Hamburger widens to a 44×44 tap target and pulls flush to `env(safe-area-inset-right)`. Wordmark `wm-name` scaled 28px → 23px (~17% reduction); `wm-sub` letter-spacing tightened 0.55em → 0.42em. The rule-slot beneath "RB" in the over-video wordmark switches from paper to pine. The hairline rule below the masthead switches from translucent-paper to pine, 1px. The "Five-unit walk-ups to billion-dollar schedules." italic in HeroLede shifts to pine. Hero-to-lede top padding reduced 48 → 36 (~25%).

New env var: `INWORLD_API_KEY` (set on Vercel Preview + Production before prod deploy). All other deliverables are zero-config.

## Planned (next-up, in order)

### C.S.1.7 — Rate-band intake rewrite
The substantive intake build. The sprint where Carbon stops being "Haiku with an editorial prompt + property lookup" and becomes an actual underwriting intake agent.

Scope:
- Add structured rate-band YAML appendix to the system prompt — maintained by Carbon's underwriters, NOT LLM hallucination. Indication ranges keyed by asset class, geography, units, and construction vintage.
- Implement the 10-field intake sequence: address → asset class → coverage scope → EQ → flood → loss history → effective date → current carrier → contact → consent.
- Encode hard handoff triggers: "Am I covered?" / "Will you pay this claim?" / portfolios > $10M total insured value / active loss in progress / litigation pending. Each triggers immediate routing to a licensed specialist with no indication offered.
- Three locked disclaimers in every indication response (not generated by the LLM — concatenated post-generation).
- Portfolio detection short-circuits to specialist routing.
- Extract mode tool migrates from second-LLM-call to structured tool definition.

### C.S.1.8 — PostHog instrumentation of chat funnel
Event capture: `chat_opened`, `address_submitted`, `enrichment_succeeded`, `enrichment_failed`, `intake_completed`, `handoff_triggered`, `lead_submitted`. Funnel and conversion dashboards in PostHog. Privacy mode on by default.

### C.S.1.flip — Launch flip
Remove noindex meta tag and update `/robots.txt` to allow indexing. Swap real contact info into all placeholders. Submit sitemap to Google Search Console + Bing Webmaster Tools. Configure carbonspecialty.com in PostHog as a production project. Verify analytics fire. This sprint is the launch.

### C.S.2.* — Post-launch refinement (numbering TBD)
- Production email at hello@carbonspecialty.com (Resend domain setup with DKIM/SPF/DMARC, inbound parsing)
- Refine rate-band YAML from real bind data after first ~25 placements
- Add a "Standard Quote Form" path that bypasses chat for users who prefer forms — already partially wired via `/api/lead-fallback`
- Specialist-side admin panel for reviewing intake submissions and triggering carrier marketing

### C.S.3.* — Scale enhancements
- Cape Analytics Property Mapper upgrade — only justified once placement volume warrants the enterprise contract
- First Street climate risk integration for property scoring
- Multi-state expansion as Distinguished/Honeycomb wholesale relationships mature

## Parked / Not pursuing

- Two-key hygiene split for Google Maps APIs (server-side + client-side keys). Considered, deferred. Single-key approach works for now.
- The nested-directory cleanup of the local repo path (Windows-style separators). Not breaking anything, low priority.
- Anthropic API key rotation after operator pasted real key value in shell history. Operator declined. Not bringing it up again.

## Workflow conventions (referenced by every sprint)

- **One PR per sprint.** No "pre-work small PR" patterns, no chained-PR sequences.
- **Claude Code prompts stripped of verification scaffolding.** No "use Playwright MCP" steps, no halt-and-report clauses, no multi-anchor manual verification.
- **Auto-merge per 4-criteria gate**: Vercel preview green + CI green + agent self-verification + no operator-decision content.
- **Production deploys require explicit operator confirmation** via AGENTS.md prompt. Agent surfaces "Confirm proceed to production?" and waits for "yes proceed" from Robby.
- **Test sprints ship separately AFTER a feature is on production** — never bundled into feature sprints.
- **Brand discipline at component level (restraint), drama at layout level.** Every sprint maintains this — no exceptions.
