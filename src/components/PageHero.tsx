/**
 * PageHero — sprint C.S.2.0.5.
 *
 * Shared dark page-hero for inner pages (How it works, About,
 * Contact). Carries the same C.S.2.0 editorial pattern the
 * homepage hero uses — eyebrow micro-label in pine, Plex Serif
 * headline with a Bodoni italic pine accent, body lede in muted
 * paper. Lighter chrome than the homepage Hero (no inline console,
 * no video background, smaller vertical) so it reads as the page
 * masthead, not a hero takeover.
 *
 * The accent is rendered as a separate prop so callers can opt
 * into the italic emphasis (recommended) or pass a plain string
 * headline.
 */

import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  headline,
  accent,
  lede,
}: {
  eyebrow: string;
  headline: ReactNode;
  /** Italic Bodoni pine accent appended inline after the headline. */
  accent?: string;
  lede?: ReactNode;
}) {
  return (
    <section className="cs-page-hero" aria-labelledby="page-hero-headline">
      <div className="container cs-page-hero__inner">
        <span className="cs-page-hero__eyebrow">{eyebrow}</span>
        <h1 id="page-hero-headline" className="cs-page-hero__headline">
          {headline}
          {accent ? (
            <>
              {" "}
              <em className="cs-page-hero__accent">{accent}</em>
            </>
          ) : null}
        </h1>
        {lede ? <p className="cs-page-hero__lede">{lede}</p> : null}
      </div>

      <style>{`
        .cs-page-hero {
          background: var(--ink);
          color: var(--paper);
          padding: 80px 0 64px;
          border-bottom: 1px solid rgba(244,241,234,0.10);
        }
        .cs-page-hero__inner {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 960px;
        }
        .cs-page-hero__eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ember);
        }
        .cs-page-hero__headline {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 56px;
          line-height: 1.04;
          letter-spacing: -0.02em;
          color: var(--paper);
          text-wrap: balance;
        }
        .cs-page-hero__accent {
          font-family: var(--font-wordmark);
          font-style: italic;
          font-weight: 400;
          color: var(--ember);
          padding-right: 0.06em;
        }
        .cs-page-hero__lede {
          margin: 8px 0 0;
          font-family: var(--font-body);
          font-size: 18px;
          line-height: 1.6;
          color: rgba(244,241,234,0.70);
          max-width: 64ch;
          text-wrap: pretty;
        }

        @media (max-width: 768px) {
          .cs-page-hero { padding: 56px 0 48px; }
          .cs-page-hero__headline { font-size: 40px; }
          .cs-page-hero__lede { font-size: 16px; }
        }
        @media (max-width: 480px) {
          .cs-page-hero { padding: 40px 0 36px; }
          .cs-page-hero__headline { font-size: 32px; line-height: 1.08; }
        }
      `}</style>
    </section>
  );
}
