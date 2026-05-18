# Carbon Specialty — Design System

**Last updated: May 17, 2026**

The Carbon design system is editorial-architectural. The reference points are well-designed print magazines (Apartamento, The Gentlewoman, Dwell), considered urbanism firms, and modern editorial software like Linear and Vercel — not insurance, not InsurTech disruption, not "friendly chatbot."

The discipline: restraint at the component level, drama at the layout level. A single page can have a full-bleed B&W hero video and XL display type, but every button, card, and form field stays geometric, minimal, and quiet.

## Color tokens

```css
--ink:    #0B0B0C;  /* Primary text, hard borders, dark surfaces */
--paper:  #F5F2EC;  /* Body background, light surfaces */
--pine:   #1F4D38;  /* Brand accent — buttons, links, hero overlays */
--ember:  #C45A2E;  /* Reserved accent — status dots, hover states, attention moments */
```

That is the entire palette. No grays beyond what naturally occurs in B&W photography. No additional brand colors. Status states (success, error, info) are communicated through copy and layout, not red/yellow/green chips.

## Typography

- **Bodoni Moda** — the wordmark only. The serif feels architectural without being academic. Never use for body copy.
- **IBM Plex Serif** — editorial body copy and pull quotes. Used in long-form content and hero ledes.
- **IBM Plex Sans** — UI text, labels, navigation, form fields, microcopy. The default for anything not editorial.
- **IBM Plex Mono** — status lines ("Looking up property…"), data labels (`CARBON · RESPONDING IN SECONDS`), reference IDs, metadata. Used sparingly and intentionally to mark a different register of information.

### Type scale (rough)

- Display: 96px / 1.05 / Bodoni Moda — hero only
- H1: 56px / 1.1 / IBM Plex Serif
- H2: 32px / 1.2 / IBM Plex Serif
- Body large: 20px / 1.5 / IBM Plex Serif
- Body: 16px / 1.6 / IBM Plex Serif (long-form) or IBM Plex Sans (UI)
- Caption / Mono: 13px / 1.4 / IBM Plex Mono, uppercase, letter-spacing 0.08em

## Layout rules

- 12-column grid. Asymmetric compositions encouraged — content frequently sits in 6 or 8 columns with intentional white space, not centered slabs.
- Generous vertical rhythm. Sections breathe.
- Marginalia and pagination marks (drop caps, page numbers, paginated rules) reference print conventions and appear on long-form pages. Used as flavor, never decoration.
- The hero is full-bleed by default — video, image, or composition extends edge-to-edge.

## Component conventions (non-negotiable)

- **No border-radius greater than 4px.** Buttons, cards, inputs, modals — all sharp or near-sharp. The visual character is architectural, not soft.
- **No box-shadows.** Depth is created through color contrast, weight, and layout, not drop shadows.
- **No gradients except strategic hero overlays.** Hero video sometimes uses ink overlays at 85-95% opacity for text legibility. Otherwise, no gradients anywhere.
- **No glassmorphism, no neumorphism, no skeuomorphism.** Surfaces are flat and considered.
- **No emoji in customer-facing UI.** Status communication is textual or geometric.
- **Cards** — paper background, 1px ink border, no shadow. Hover state: L→R ink fill animation, no scale or shadow change.
- **Buttons** — pine fill with paper text for primary, ink outline with ink text for secondary. Disabled state reduces opacity to 0.4, no other change.

## Photography direction

- B&W only. Always.
- Editorial framing — wide compositions, architectural subjects, considered lighting. No people-as-subjects unless their role is clear and dignified.
- Painted Ladies (San Francisco), apartment buildings at golden hour rendered in B&W, urban architecture details — these are the reference targets.
- No stock photos that read as stock photos. No smiling families in front of houses. No briefcase-and-suit insurance imagery.
- AI-generated imagery is acceptable when the result is editorial. OpenArt (Flux Pro for stills, Seedance 2.0 for video) is the current pipeline.

## Motion principles

- Calm and purposeful. Motion communicates state, never decoration.
- Default durations: 150ms (micro-interactions), 300ms (component transitions), 600ms (page-level reveals).
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for most things. Linear for status pulses.
- Scroll-reveal primitives in use on the long-form pages — content fades + 8px translate from below as it enters viewport.
- No bouncing, no parallax overload, no scroll-jacking.

## CarbonChat (the AI intake widget) specifics

- Slide-out from the right edge on desktop, full-screen takeover on mobile (≤480px).
- Header: `Carbon · AI intake · online` with a pulsing pine dot. The header is the only tech signal — no "Powered by Claude," no "AI by Anthropic," no Covr reference.
- Carbon's messages render in paper-card style on ink background. User's messages render in ink-on-paper.
- Status line ("Looking up property…") renders in IBM Plex Mono, ember accent, with a subtle dot-blink animation. Appears within ~1 second of user submitting an address-like input.
- Input is a 2-line textarea. Placeholder rotates between editorial examples: "Mixed-use, ground-floor retail, Pasadena…", "12-unit apartment, 1968 vintage, Phoenix…", "SFR portfolio across the Inland Empire…"
- Submit button reads "Ask Carbon →" in IBM Plex Sans. Pine fill, paper text. No icon other than the arrow.

## Hero composition (home page)

- Full-bleed B&W video plate behind the wordmark.
- Wordmark "CA**RB**ON" in Bodoni Moda — "CA" and "RBON" in paper, "RB" in pine (the rotating brand mark detail).
- Hero lede in IBM Plex Serif Italic for the emphasized phrase, regular for the rest. The line break before "home." is intentional — that word stands alone on its own line, italic pine.
- Below the hero: an editorial paper-background section with the body lede about Carbon's scope.
- Below that: the chat input visible immediately, not gated behind a CTA. The pitch is "ask now, not later."

## What NOT to do

- No "modern SaaS" gradient hero with a screenshot of the product.
- No three-column "Features" grids with icons.
- No customer testimonial carousels with headshots.
- No pricing tiers (Carbon doesn't sell tiered products — it's a brokerage).
- No animated counters ("$2.4B placed!"). Carbon doesn't perform.
- No "Get a quote in 60 seconds" hero — that's the InsurTech mode Carbon is positioning against.
- No fully-rounded buttons (anything > 4px). No drop shadows. No gradients outside the hero.

## Skill reference for build sessions

When generating new components or CSS, the frontend-design skill at `/mnt/skills/public/frontend-design/SKILL.md` is the technical companion to this document. Read it before any component work — it has explicit guidance on layout primitives, spacing tokens, and the design-token CSS conventions used in this codebase. Carbon's design discipline is consistent with that skill's principles, with the added constraint of the editorial-architectural brand frame defined here.
