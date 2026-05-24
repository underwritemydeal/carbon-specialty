"use client";

/**
 * Hero — sprint C.S.2.0.
 *
 * Two-column dark hero. Left (46%) carries the editorial copy
 * (eyebrow micro-label, headline with pine italic accent, body,
 * primary + secondary CTAs, three-stat metrics row, carrier strip).
 * Right (54%) is the live inline `<CarbonChat inline />` console —
 * the right column IS the intake. No separate slide-out is rendered
 * at >768px.
 *
 * Below the 768px breakpoint the right column collapses, the layout
 * stacks, and the primary CTA opens the slide-out `CarbonChat` via
 * the page-level ChatProvider (full-screen takeover from C.S.1.10).
 *
 * Background: ink base, painted-ladies hero video at ~18% opacity
 * with a pine radial glow centered behind the right console. Video
 * falls back to /images/painted-ladies.jpg if media is unavailable
 * (autoPlay muted playsInline loop — same iOS-safe attribute set as
 * prior sprints).
 */

import { useRef } from "react";
import Link from "next/link";
import { CarbonChat } from "./CarbonChat";
import { useChat } from "./ChatProvider";

const HEADLINE_PRIMARY = "Insuring the buildings that make our cities";
const HEADLINE_ACCENT = "home.";
const BODY_COPY =
  "Tell us what you own. Carbon turns the conversation into a clean property submission and connects you with real coverage options from a specialist.";

const METRICS: Array<{ value: string; label: string }> = [
  { value: "$5B+", label: "Property value insured" },
  { value: "1,000+", label: "Properties covered" },
  { value: "<10 min", label: "Avg response time" },
];

const CARRIERS = "Chubb · Travelers · Liberty Mutual · Nationwide · and more";

export function Hero() {
  const { open: onOpenChat } = useChat();
  const sectionRef = useRef<HTMLElement>(null);

  // C.S.2.0.8 — the inline console renders at all breakpoints now,
  // so the primary CTA always focuses (and scrolls to) the inline
  // textarea regardless of viewport. The slide-out CarbonChat in
  // ChatProvider is still mounted as a safety net — if the inline
  // textarea isn't in the DOM for any reason (race during hydration,
  // future code path) we fall through to opening the slide-out.
  const onStartQuote = () => {
    const el = document.getElementById("cs-console-input") as HTMLTextAreaElement | null;
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      onOpenChat();
    }
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-headline"
      className="cs-hero"
    >
      {/* Background video — desktop landscape, mobile portrait. Both
          tags share the same parallax-free wrap. CSS toggles which
          one is visible at the 768px breakpoint (carries over from
          C.S.1.10.1). */}
      <div className="cs-hero__bg" aria-hidden>
        <video
          className="cs-hero__video cs-hero__video--desktop"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/hero-painted-ladies-poster.jpg"
          aria-hidden="true"
        >
          <source src="/videos/hero-painted-ladies.webm" type="video/webm" />
          <source src="/videos/hero-painted-ladies.mp4" type="video/mp4" />
        </video>
        <video
          className="cs-hero__video cs-hero__video--mobile"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/hero-mobile-poster.jpg"
          aria-hidden="true"
        >
          <source src="/videos/hero-mobile.webm" type="video/webm" />
          <source src="/videos/hero-mobile.mp4" type="video/mp4" />
        </video>
        <img
          src="/images/painted-ladies.jpg"
          alt=""
          aria-hidden
          className="cs-hero__bg-fallback"
        />
        <div className="cs-hero__bg-tint" />
        <div className="cs-hero__bg-glow" />
      </div>

      <div className="container cs-hero__inner">
        <div className="cs-hero__grid">
          {/* LEFT — copy column */}
          <div className="cs-hero__copy">
            <span className="cs-hero__eyebrow">Insurance for real estate investors</span>

            <h1 id="hero-headline" className="cs-hero__headline">
              {HEADLINE_PRIMARY}
              <br />
              <em className="cs-hero__headline-accent">{HEADLINE_ACCENT}</em>
            </h1>

            <p className="cs-hero__body">{BODY_COPY}</p>

            <div className="cs-hero__ctas">
              <button
                type="button"
                onClick={onStartQuote}
                className="cs-hero__cta-primary"
              >
                Start your quote
                <Arrow />
              </button>
              <Link href="/how-it-works" className="cs-hero__cta-secondary">
                See how it works
              </Link>
            </div>

            <ul className="cs-hero__metrics">
              {METRICS.map((m, i) => (
                <li key={m.label} className="cs-hero__metric" data-first={i === 0 ? "true" : "false"}>
                  <span className="cs-hero__metric-value">{m.value}</span>
                  <span className="cs-hero__metric-label">{m.label}</span>
                </li>
              ))}
            </ul>

            <div className="cs-hero__carriers">
              <span className="cs-hero__carriers-label">Placed with top carriers nationwide</span>
              <span className="cs-hero__carriers-list">{CARRIERS}</span>
            </div>
          </div>

          {/* RIGHT — inline intake console (desktop only). At ≤768px
              this column is hidden via CSS and the slide-out chat in
              ChatProvider handles input. */}
          <div className="cs-hero__console">
            <CarbonChat inline open onClose={() => undefined} />
          </div>
        </div>
      </div>

      <style>{`
        .cs-hero {
          position: relative;
          background: var(--ink);
          color: var(--paper);
          min-height: 800px;
          padding: 80px 0 72px;
          overflow: hidden;
          isolation: isolate;
        }
        .cs-hero__inner { position: relative; z-index: 2; max-width: 1320px; }
        .cs-hero__bg {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
        }
        .cs-hero__video,
        .cs-hero__bg-fallback {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.18;
        }
        .cs-hero__bg-fallback { display: none; }
        .cs-hero__video--mobile { display: none; }
        .cs-hero__bg-tint {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(11,11,12,0.40) 0%, rgba(11,11,12,0.60) 100%);
        }
        .cs-hero__bg-glow {
          position: absolute;
          right: -10%;
          top: 10%;
          width: 70%;
          height: 80%;
          background: radial-gradient(ellipse at center, rgba(31,77,56,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .cs-hero__video { display: none !important; }
          .cs-hero__bg-fallback { display: block; }
        }

        .cs-hero__grid {
          display: grid;
          grid-template-columns: 46% 54%;
          column-gap: 56px;
          align-items: center;
          min-height: 640px;
        }

        .cs-hero__copy {
          display: flex;
          flex-direction: column;
        }

        .cs-hero__eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ember);
        }
        .cs-hero__headline {
          margin: 18px 0 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 64px;
          line-height: 1.0;
          letter-spacing: -0.02em;
          color: var(--paper);
          text-wrap: balance;
        }
        .cs-hero__headline-accent {
          font-family: var(--font-wordmark);
          font-style: italic;
          font-weight: 400;
          color: var(--ember);
          padding-right: 0.06em;
          /* Soft ink halo carried over from C.S.1.5.1 so Bodoni italic
             pine reads cleanly on the video-tinted ink ground. */
          text-shadow: 0 2px 32px rgba(11, 11, 12, 0.5);
        }
        .cs-hero__body {
          margin: 24px 0 0;
          font-family: var(--font-body);
          font-size: 18px;
          line-height: 1.6;
          color: rgba(244,241,234,0.70);
          max-width: 56ch;
          text-wrap: pretty;
        }
        .cs-hero__ctas {
          margin-top: 36px;
          display: inline-flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .cs-hero__cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 22px;
          background: var(--ember);
          color: var(--paper);
          border: 1px solid var(--ember);
          border-radius: 8px;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          cursor: pointer;
          transition: background var(--dur-fast) var(--ease),
                      border-color var(--dur-fast) var(--ease);
        }
        .cs-hero__cta-primary:hover {
          background: var(--ember-ink);
          border-color: var(--ember-ink);
        }
        .cs-hero__cta-secondary {
          display: inline-flex;
          align-items: center;
          padding: 13px 22px;
          background: transparent;
          color: var(--paper);
          border: 1px solid rgba(244,241,234,0.20);
          border-radius: 8px;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          transition: border-color var(--dur-fast) var(--ease),
                      background var(--dur-fast) var(--ease);
        }
        .cs-hero__cta-secondary:hover {
          border-color: rgba(244,241,234,0.40);
          background: rgba(244,241,234,0.04);
        }

        .cs-hero__metrics {
          list-style: none;
          margin: 40px 0 0;
          padding: 0;
          display: flex;
          align-items: stretch;
          gap: 32px;
        }
        .cs-hero__metric {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-left: 32px;
          border-left: 1px solid rgba(244,241,234,0.20);
        }
        .cs-hero__metric[data-first="true"] {
          padding-left: 0;
          border-left: 0;
        }
        .cs-hero__metric-value {
          font-family: var(--font-display);
          font-size: 28px;
          line-height: 1;
          color: var(--paper);
        }
        .cs-hero__metric-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.50);
        }

        .cs-hero__carriers {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cs-hero__carriers-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.40);
        }
        .cs-hero__carriers-list {
          font-family: var(--font-body);
          font-size: 14px;
          color: rgba(244,241,234,0.50);
        }

        .cs-hero__console { min-width: 0; }

        /* Tablet / mobile collapse — single column. C.S.2.0.8: the
           inline console is now visible at all breakpoints (was
           hidden ≤768px previously, leaving mobile users without
           the chat surface until they tapped a CTA). The console
           stacks below the hero copy here; the slide-out remains
           mounted in ChatProvider as a fallback. Mobile video swap
           fires at the same 768px breakpoint. */
        @media (max-width: 768px) {
          .cs-hero { padding: 56px 0 56px; min-height: 0; }
          .cs-hero__grid {
            grid-template-columns: 1fr;
            row-gap: 40px;
            min-height: 0;
          }
          .cs-hero__headline { font-size: 44px; }
          .cs-hero__video--desktop { display: none !important; }
          .cs-hero__video--mobile { display: block; }
        }
        /* C.S.2.0.1 (mobile patch) — stats stack vertically at
           ≤768px. The horizontal row with 32px-padding vertical
           dividers was overflowing on phones; column-stack with
           a horizontal hairline below each (except the last) reads
           cleaner and lets us go up to 32px on the value since the
           row no longer has to fit three side by side. */
        @media (max-width: 768px) {
          .cs-hero__metrics {
            flex-direction: column;
            gap: 0;
          }
          .cs-hero__metric {
            padding: 16px 0;
            padding-left: 0;
            border-left: 0;
            border-bottom: 1px solid rgba(244,241,234,0.15);
            width: 100%;
          }
          .cs-hero__metric:last-child { border-bottom: 0; }
          .cs-hero__metric-value { font-size: 32px; }
          .cs-hero__metric-label { font-size: 10px; }
        }

        @media (max-width: 480px) {
          .cs-hero { padding: 40px 0 48px; }
          .cs-hero__headline { font-size: 36px; line-height: 1.05; }
          .cs-hero__body { font-size: 16px; }
        }
      `}</style>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14 6 20 12 14 18" />
    </svg>
  );
}
