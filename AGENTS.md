<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deploy safety

Production deploys require explicit operator confirmation immediately before
execution, separate from any prior conversation about deployment. Pattern:

1. Operator asks for deploy: "deploy to vercel"
2. Agent responds: "This will deploy to production at
   https://carbon-specialty.vercel.app/. Site is currently configured to
   [indexable | noindex]. Confirm proceed to production, or specify
   --preview for a preview deploy."
3. Wait for explicit "yes proceed to production" or equivalent.
4. Only then run `vercel deploy --prod`.

This applies to first deploy, post-DNS-cutover deploys, and any deploy after
significant marketing copy or stats changes. Preview deploys
(`vercel` without `--prod`, or `vercel --preview`) do not require this
confirmation step.

## Chat architecture (post-C.S.1.6)

**Carbon Specialty chat bypasses the Covr Worker entirely.** All chat
completions now run through Next.js API routes on the same Vercel
deployment, calling the Anthropic Messages API directly with the
official `@anthropic-ai/sdk`. Worker integration becomes a future
migration once the Covr Worker repo is surfaced for proper tool-use
support.

### Routes

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | The single chat endpoint. Accepts `{ messages, mode? }` where `mode: "intake" \| "extract"` (default `"intake"`). |
| `POST /api/property/enrich` | Looks up canonical address + parcel facts + Street View URL for a property. Called by the chat's `enrich_property` tool. |
| `POST /api/lead-fallback` | Resend-based lead persistence. Unchanged from C.S.1.4. |

### Intake call

`POST /api/chat` with `mode: "intake"`:

- Model: `claude-haiku-4-5-20251001` (Haiku is the right tier for intake; Sonnet is reserved for the underwriter-side tools we haven't built yet).
- System prompt: `CARBON_INTAKE_SYSTEM_PROMPT` from `src/lib/carbon-system-prompt.ts`, sent as a single block with `cache_control: { type: "ephemeral" }` so it's cached across turns.
- Tools registered: `enrich_property` (see `src/lib/chat-tools.ts`).
- Server-side tool-use loop: when the model returns `stop_reason: "tool_use"`, the route executes every tool_use block, appends `tool_result` messages, and re-invokes Anthropic. Loop caps at 5 iterations (`LOOP_EXHAUSTED` error otherwise) to prevent runaway.
- Returns `{ ok, text, tools_executed, property_facts? }`. `property_facts` surfaces the last enrich result so the client can render it natively in a future sprint.

### Extract call

`POST /api/chat` with `mode: "extract"`:

- Same model, no tools, no prompt caching (extraction prompt is short and runs once per conversation).
- System prompt: `CARBON_EXTRACTION_SYSTEM_PROMPT`.
- Returns `{ ok, text }`. Client parses the text as JSON matching `CarbonIntakePayload`.

### Tool: `enrich_property`

- Single parameter: `address: string`.
- Implementation: `executeTool` in `src/lib/chat-tools.ts` POSTs to `${origin}/api/property/enrich` (server-to-server HTTP hop on the same Vercel deployment — keeps the tool independently testable).
- `/api/property/enrich` composes three upstreams: Google Geocoding API, Regrid Parcel API, and a synthetic Google Street View Static URL.
- Both real upstream fetches use `next: { revalidate: 2592000 }` (30-day edge cache). No Upstash, no external KV.
- Partial-failure semantics: response always includes `sources_succeeded` + `sources_failed`. 200 with whatever was retrieved when at least one source succeeded. 502 only when every source fails. 400 on missing/malformed address.

### Error categories (logged with `[carbon-chat]` prefix)

| Kind | Cause | Client action |
| --- | --- | --- |
| `BAD_REQUEST` | Missing `ANTHROPIC_API_KEY`, malformed body | `CarbonChat` falls through to contact-form mode |
| `ANTHROPIC_AUTH` | 401/403 from Anthropic | Same |
| `ANTHROPIC_RATE_LIMIT` | 429 | Same |
| `ANTHROPIC_SERVER` | 5xx or network | `CarbonChat` retries once, then falls through |
| `TOOL_EXECUTION_FAIL` | Tool dispatcher threw or returned `ok: false` | Same |
| `LOOP_EXHAUSTED` | Hit `MAX_TOOL_ITERATIONS` without natural stop | Same |

The discriminated error union surfaces back to the client as `ChatError` with kinds `auth | rate-limit | server | network | bad-shape | tool-fail`. The retry/fallthrough logic in `CarbonChat.tsx` is unchanged from C.S.1.4.

### Env vars

| Variable | Required | When missing |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes for chat | `/api/chat` returns 503 `BAD_REQUEST`. Chat falls to contact-form mode. |
| `REGRID_API_TOKEN` | Yes for parcel lookup | `/api/property/enrich` returns 200 with `regrid` in `sources_failed`. Tool result instructs the model to ask the user directly. |
| `GOOGLE_MAPS_API_KEY` | Yes for geocoding + street view | `/api/property/enrich` returns 200 with `geocoding` and `streetview` in `sources_failed`. Same fallback as above. |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | Yes for first-message Places Autocomplete (C.S.1.6.1) | CarbonChat skips autocomplete wiring; the textarea still works for free-text input. |
| `FALLBACK_EMAIL_TO` + `RESEND_API_KEY` | Yes for lead email | `/api/lead-fallback` returns 200 `logged-only`. Payload visible in Vercel runtime logs. |
| `NEXT_PUBLIC_LEADS_ENDPOINT_READY` / `_ENDPOINT` | No (forward-compat) | Default false → submissions always go through `/api/lead-fallback`. |
| `NEXT_PUBLIC_SITE_URL` / `_POSTHOG_*` | No | Defaults / analytics off. |

Operator sets these in Vercel after merge. Routes ship in a graceful-degradation state until then — no 5xx on missing keys.

### Migration note — Worker

The Covr Worker CORS blocker (the C.A.1.5 deferral that previously prevented `*.vercel.app` preview origins from reaching `/v1/messages`) **no longer blocks Carbon Specialty chat.** Carbon doesn't talk to the Worker anymore.

That CORS blocker still blocks the two Phase 4 verification specs in the `mycovrai` repo (the ones that run Playwright against `*.vercel.app` preview deployments). Those need the Worker allowlist fix independently.

Future Worker integration for Carbon (when the Worker repo is surfaced and tool-use support is wired): swap `callChat` in `src/lib/carbon-intake.ts` to point back at the Worker. The system prompt + tool registry stay the same. The /api/chat route would become the Carbon-only fallback path.

## Chat behavior contract (sprint C.S.1.4)

The hero chat — `src/components/CarbonChat.tsx` — is an active AI intake
specialist named "Carbon," not a UI shell. It runs two distinct calls
against the Covr Worker:

1. **Intake call** (`askCarbonIntake` in `src/lib/carbon-intake.ts`) —
   per-turn conversational reply using `CARBON_INTAKE_SYSTEM_PROMPT`
   from `src/lib/carbon-system-prompt.ts`. Carbon asks 4–6 questions
   total, 1–2 per turn, working toward asset type / location / units /
   current carrier / loss history / contact. Tone is editorial-
   professional; building owners and operators, not clients.

2. **Extraction call** (`extractIntakePayload`) — fires once the intake
   reply contains the literal sentinel `INTAKE_WRAPUP_SENTINEL`
   ("I have what a specialist needs to start."). Same Worker, different
   system prompt (`CARBON_EXTRACTION_SYSTEM_PROMPT`), returns strict
   JSON matching the `CarbonIntakePayload` interface. The client wraps
   the JSON with `conversation_full`, `source`, `submitted_at`, and a
   client-generated `reference_id` (`CS-YYYY-XXXX` hex) and submits via
   `submitIntake`.

3. **Persistence** (`submitIntake`) — POSTs to
   `/api/lead-fallback`, which formats a plaintext + HTML email and
   sends via Resend. When `NEXT_PUBLIC_LEADS_ENDPOINT_READY === "true"`
   it first attempts the Worker's `/leads/inbound` and only falls back
   to the Resend route on failure. Until that env flips true, every
   submission goes straight to Resend.

4. **Confirmation** — Carbon posts a final assistant message containing
   the reference ID and a "you can close this window" line.

**Error handling, in order of severity:**

| Failure | Behavior |
| --- | --- |
| `NEXT_PUBLIC_COVR_API_URL` unset, Worker 401/403, JSON parse error | Immediate fall-through to **contact-form mode** (name/email/note → Resend, single shot). |
| Worker 5xx or network/CORS error | Retry once after 600ms, then fall through to contact-form mode. |
| Resend failure (no API key, rate limit, 5xx) | Show the user-facing error: "Something went wrong submitting — please email hello@carbonspecialty.com directly with your inquiry." Log to `console.error` for Vercel runtime logs. |

`hello@carbonspecialty.com` does not yet exist — it's a pre-launch
checklist item, not a sprint blocker.

### Env var requirements

| Variable | Required for | When missing |
| --- | --- | --- |
| `NEXT_PUBLIC_COVR_API_URL` | AI intake mode | Chat immediately falls to contact-form mode. |
| `NEXT_PUBLIC_LEADS_ENDPOINT` | Worker-side persistence | Ignored when `NEXT_PUBLIC_LEADS_ENDPOINT_READY` is unset/false. |
| `NEXT_PUBLIC_LEADS_ENDPOINT_READY` | Toggles Worker persistence first | Default false → always Resend. |
| `FALLBACK_EMAIL_TO` | Resend email destination | Route logs the payload to console and returns 200 (route: `logged-only`). No email sent. |
| `RESEND_API_KEY` | Resend send | Same `logged-only` path as above. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OG | Defaults to `https://carbonspecialty.com`. |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | Analytics | No analytics events captured. Chat still works. |

### Worker CORS blocker — DEFERRED to a separate sprint

The chat code path is wired and shipping. It will work end-to-end as
soon as the Covr Worker CORS allowlist accepts the carbon-specialty
origins. Until then, prospects hit the contact-form mode automatically.

**Resolution** (when next surfaced on the `mycovrai` repo):
- Add `https://carbon-specialty.vercel.app` (all preview subdomains)
  and `https://carbonspecialty.com` to the Worker's CORS allowlist.
- Confirm the Worker returns the standard CORS headers
  (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`,
  `Access-Control-Allow-Headers`) on both preflight and POST.
- Log a TODO entry in `mycovrai/COVR_AI_TODO.md` so it doesn't get
  lost — heading: "Carbon Specialty CORS allowlist."

No code in this repo needs to change once that lands; the chat will
start exchanging messages with the Worker on the next page load.

## Pre-launch lockdown (sprint C.S.1.1)

While the site is pre-launch:

- Root `metadata.robots` is set to `{ index: false, follow: false,
  googleBot: { index: false, follow: false } }` in `src/app/layout.tsx`.
- `src/app/robots.ts` returns `{ rules: [{ userAgent: "*", disallow: "/" }] }`
  (no sitemap, no per-rule allow).
- `/llms.txt` carries a "Status: Pre-launch" line at the top.
- `SITE.phone`, `SITE.phoneDisplay`, and `SITE.email` are `null`. No surface
  may emit them; the `tel:`/`mailto:` shortcuts and the Stats fabricated
  numbers were removed in this sprint.

To exit lockdown: flip `metadata.robots`, restore the per-rule allow + sitemap
reference in `robots.ts`, drop the status line in `/llms.txt`, populate the
three `SITE` constants with real values, and put `telephone`/`email` back into
`insuranceAgency()` and `localBusiness()` in `src/lib/schema.ts`. Then
exercise the Deploy safety pattern above.
