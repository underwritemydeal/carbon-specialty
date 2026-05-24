"use client";

/**
 * BottomCTA — sprint C.S.2.0.
 *
 * Repeats the primary CTA below the editorial flow. Schedule-a-call
 * link reuses the SCHEDULE_URL constant from the C.S.1.9 sprint so
 * there's a single place to update the Cal.com URL pre-launch.
 *
 * "Start your quote →" reuses the same dual-surface logic as the
 * hero: at >768px it focuses the inline console textarea; at ≤768px
 * it opens the slide-out CarbonChat via ChatProvider.
 */

import { useChat } from "./ChatProvider";

// Mirrored from HeroLede (C.S.1.9). Update both constants together
// when the real Cal.com URL is ready.
const SCHEDULE_URL = "https://cal.com/carbonspecialty";

export function BottomCTA() {
  const { open: onOpenChat } = useChat();

  // C.S.2.0.8 — the inline console renders at all breakpoints now,
  // so the primary CTA always focuses + scrolls to the inline
  // textarea. The slide-out CarbonChat in ChatProvider remains as
  // a fallback if the textarea isn't in the DOM (e.g. on pages
  // that don't render the Hero — Insights, Contact, etc.).
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
    <section aria-labelledby="bottom-cta-headline" className="cs-bcta">
      <div className="container cs-bcta__inner">
        <div className="cs-bcta__left">
          <span className="cs-bcta__eyebrow">Ready to get started?</span>
          <h2 id="bottom-cta-headline" className="cs-bcta__headline">
            Start your quote in minutes. Get real options, faster.
          </h2>
        </div>
        <div className="cs-bcta__right">
          <button type="button" onClick={onStartQuote} className="cs-bcta__cta">
            Start your quote
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          </button>
          <a href={SCHEDULE_URL} className="cs-bcta__schedule">
            Prefer to talk? Schedule a call →
          </a>
        </div>
      </div>

      <style>{`
        .cs-bcta {
          background: #0D1214;
          color: var(--paper);
          border-top: 1px solid rgba(244,241,234,0.10);
          padding: 64px 0;
        }
        .cs-bcta__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }
        .cs-bcta__left {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cs-bcta__eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ember);
        }
        .cs-bcta__headline {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 32px;
          line-height: 1.2;
          color: var(--paper);
          max-width: 36ch;
          text-wrap: balance;
        }
        .cs-bcta__right {
          display: inline-flex;
          align-items: center;
          gap: 24px;
          flex-shrink: 0;
        }
        .cs-bcta__cta {
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
        .cs-bcta__cta:hover {
          background: var(--ember-ink);
          border-color: var(--ember-ink);
        }
        .cs-bcta__schedule {
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--ember);
          text-decoration: none;
          border-bottom: 1px solid transparent;
          padding-bottom: 1px;
          transition: border-color var(--dur-fast) var(--ease);
        }
        .cs-bcta__schedule:hover { border-bottom-color: var(--ember); }

        @media (max-width: 768px) {
          .cs-bcta__inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }
          .cs-bcta__right { flex-wrap: wrap; gap: 16px; }
          .cs-bcta__headline { font-size: 26px; }
        }
        @media (max-width: 480px) {
          .cs-bcta { padding: 48px 0; }
        }
      `}</style>
    </section>
  );
}
