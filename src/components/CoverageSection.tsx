"use client";

/**
 * CoverageSection — sprint C.S.2.0.
 *
 * Three-column dark section: asset-list (left), photographic center
 * column with painted-ladies.jpg, pull-quote + Gary M. attribution
 * (right). Asset rows are hairline-divided and link into the
 * coverage detail pages (kept under /what-we-write per the C.S.1.6.5
 * route map).
 */

import Link from "next/link";

const ASSETS = [
  { label: "Multifamily", href: "/what-we-write#multifamily" },
  { label: "Mixed-use", href: "/what-we-write#mixed-use" },
  { label: "Rentals & SFR Portfolios", href: "/what-we-write#sfr" },
  { label: "HOA & Community Associations", href: "/what-we-write#hoa" },
  { label: "Apartments", href: "/what-we-write#multifamily" },
];

export function CoverageSection() {
  return (
    <section aria-labelledby="coverage-headline" className="cs-cov">
      <div className="container cs-cov__inner">
        {/* LEFT — copy + asset list */}
        <div className="cs-cov__left">
          <span className="cs-cov__eyebrow">Built for investors</span>
          <h2 id="coverage-headline" className="cs-cov__headline">
            Coverage that fits the way you invest.
          </h2>

          <ul className="cs-cov__assets">
            {ASSETS.map((a) => (
              <li key={a.label} className="cs-cov__asset">
                <Link href={a.href} className="cs-cov__asset-link">
                  <span>{a.label}</span>
                  <span className="cs-cov__asset-arrow" aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/what-we-write" className="cs-cov__more">View all coverages →</Link>
        </div>

        {/* CENTER — photographic column */}
        <div className="cs-cov__photo" aria-hidden>
          <img
            src="/images/painted-ladies.jpg"
            alt=""
            className="cs-cov__photo-img"
            loading="lazy"
          />
          <div className="cs-cov__photo-tint" />
        </div>

        {/* RIGHT — pull quote */}
        <div className="cs-cov__quote">
          <span className="cs-cov__quote-mark" aria-hidden>“</span>
          <blockquote className="cs-cov__quote-body">
            Carbon made the process incredibly easy. I got options in days,
            not weeks. Finally, an insurance partner that understands real
            estate.
          </blockquote>
          <div className="cs-cov__attribution">
            <span className="cs-cov__avatar" aria-hidden>GM</span>
            <div className="cs-cov__attribution-text">
              <span className="cs-cov__attribution-name">Gary M.</span>
              <span className="cs-cov__attribution-meta">Multifamily investor · Austin, TX</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cs-cov {
          background: var(--ink);
          color: var(--paper);
          padding: 80px 0;
        }
        .cs-cov__inner {
          display: grid;
          grid-template-columns: 40% 20% 40%;
          gap: 48px;
          align-items: stretch;
        }
        .cs-cov__left {
          display: flex;
          flex-direction: column;
        }
        .cs-cov__eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ember);
        }
        .cs-cov__headline {
          margin: 18px 0 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 40px;
          line-height: 1.1;
          color: var(--paper);
          text-wrap: balance;
        }
        .cs-cov__assets {
          list-style: none;
          margin: 32px 0 0;
          padding: 0;
        }
        .cs-cov__asset {
          border-bottom: 1px solid rgba(244,241,234,0.10);
        }
        .cs-cov__asset-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          font-family: var(--font-body);
          font-size: 16px;
          color: rgba(244,241,234,0.80);
          text-decoration: none;
          transition: color var(--dur-fast) var(--ease);
        }
        .cs-cov__asset-link:hover { color: var(--paper); }
        .cs-cov__asset-arrow {
          color: var(--ember);
          font-family: var(--font-body);
          font-size: 16px;
          transition: transform var(--dur-fast) var(--ease),
                      color var(--dur-fast) var(--ease);
        }
        .cs-cov__asset-link:hover .cs-cov__asset-arrow {
          color: var(--ember);
          transform: translateX(2px);
        }
        .cs-cov__more {
          margin-top: 16px;
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--ember);
          text-decoration: none;
          align-self: flex-start;
          border-bottom: 1px solid transparent;
          padding-bottom: 1px;
          transition: border-color var(--dur-fast) var(--ease);
        }
        .cs-cov__more:hover { border-bottom-color: var(--ember); }

        .cs-cov__photo {
          position: relative;
          border-radius: 4px;
          overflow: hidden;
          min-height: 360px;
        }
        .cs-cov__photo-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          /* C.S.2.0.4 — image is portrait (~2:3); biasing the focal
             point slightly right keeps the main building + stilt
             pillars in frame when the container crops horizontally. */
          object-position: 60% center;
        }
        .cs-cov__photo-tint {
          position: absolute;
          inset: 0;
          background: rgba(7,11,13,0.30);
          pointer-events: none;
        }

        .cs-cov__quote {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .cs-cov__quote-mark {
          display: block;
          font-family: var(--font-display);
          font-size: 48px;
          line-height: 1;
          color: var(--ember);
          margin-bottom: 12px;
        }
        .cs-cov__quote-body {
          margin: 0;
          font-family: var(--font-display);
          font-style: italic;
          font-size: 20px;
          line-height: 1.5;
          color: var(--paper);
          text-wrap: pretty;
        }
        .cs-cov__attribution {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(244,241,234,0.10);
        }
        .cs-cov__avatar {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--ember);
          color: var(--paper);
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.04em;
        }
        .cs-cov__attribution-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cs-cov__attribution-name {
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--paper);
        }
        .cs-cov__attribution-meta {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.50);
        }

        @media (max-width: 1024px) {
          .cs-cov__inner {
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          /* C.S.2.0.4 — at tablet+ the photo spans full width.
             Aspect-ratio replaces the previous fixed min-height so
             the portrait beach-house image renders without a
             harsh horizontal letterbox crop. 4:3 keeps the photo
             from dominating the section. */
          .cs-cov__photo {
            grid-column: 1 / -1;
            aspect-ratio: 4 / 3;
            min-height: 0;
          }
        }
        @media (max-width: 600px) {
          .cs-cov { padding: 56px 0; }
          .cs-cov__inner { grid-template-columns: 1fr; gap: 32px; }
          /* On phones the viewport is already tall — let the photo
             use a 3:4 portrait container so the receding pillars +
             upper deck stay visible without significant cropping. */
          .cs-cov__photo { aspect-ratio: 3 / 4; }
          .cs-cov__headline { font-size: 32px; }
        }
      `}</style>
    </section>
  );
}
