"use client";

import Link from "next/link";
import { FadeUp } from "./motion-primitives";
import { ASSET_CLASSES } from "@/lib/asset-classes";

export { ASSET_CLASSES };

/**
 * Asset class grid — editorial composition with a right-gutter pull-quote.
 *
 * Desktop layout (12-col):
 *   Cards take cols 1–10 in three rows with deliberate variation. The
 *   pull-quote sits in cols 11–12, spans all three card rows, and is
 *   vertically centered alongside them.
 *
 * Mobile (≤480px): the pull-quote moves above the cards as a horizontal
 * full-width treatment with hairline rules above and below.
 */
const LAYOUT: Array<{
  slug: typeof ASSET_CLASSES[number]["slug"];
  col: string;
  height?: number;
  featured?: boolean;
}> = [
  { slug: "multifamily", col: "col-6 start-1", height: 360, featured: true },
  { slug: "mixed-use", col: "col-4 start-7", height: 360 },
  { slug: "sfr", col: "col-4 start-1", height: 240 },
  { slug: "hoa", col: "col-3 start-5", height: 240 },
  { slug: "small-commercial", col: "col-3 start-8", height: 240 },
  { slug: "builders-risk", col: "col-6 start-1", height: 300, featured: true },
];

export function AssetClassesGrid() {
  return (
    <section
      id="what-we-write"
      style={{
        background: "var(--paper)",
        borderBottom: "1px solid var(--ink)",
        paddingBlock: "128px 144px",
      }}
    >
      <div className="container">
        {/* Section masthead */}
        <FadeUp className="grid-12">
          <div className="col-12">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              03 — What we write
            </span>
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <h2
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              maxWidth: "20ch",
              textWrap: "balance",
            }}
          >
            Six asset classes.{" "}
            <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
              One short list of markets per class.
            </em>
          </h2>
        </FadeUp>

        <div className="rule" style={{ marginBlock: 80 }} />

        {/* MOBILE pull-quote — horizontal full-width above the cards.
            Hidden on desktop. */}
        <PullQuote variant="mobile" />

        {/* Grid: cards in cols 1-10, pull-quote in cols 11-12 spanning rows */}
        <div className="grid-12 ac-grid" style={{ rowGap: 32, alignItems: "stretch" }}>
          {LAYOUT.map((spot, i) => {
            const item = ASSET_CLASSES.find((a) => a.slug === spot.slug)!;
            const featured = spot.featured;
            return (
              <FadeUp key={spot.slug} className={spot.col} delay={i * 0.04}>
                <article
                  id={item.slug}
                  className={`ac-card ${featured ? "ac-card--featured" : ""}`}
                  data-featured={featured ? "true" : "false"}
                  style={{
                    minHeight: spot.height,
                  }}
                >
                  {/* The ink-fill layer — animates L→R on hover.
                      Featured cards already have ink background, so no layer. */}
                  {!featured && <span className="ac-card__fill" aria-hidden />}
                  <div className="ac-card__inner">
                    <div className="ac-card__head">
                      <span className="ac-card__eyebrow">{item.n} — Class</span>
                      <span className="ac-card__index">/ 06</span>
                    </div>
                    <h3 className="ac-card__title">{item.name}</h3>
                    <p className="ac-card__body">{item.body}</p>
                    <Link href={`/what-we-write#${item.slug}`} className="ac-card__cta">
                      See coverage →
                    </Link>
                  </div>
                </article>
              </FadeUp>
            );
          })}

          {/* DESKTOP pull-quote — right gutter, cols 11-12, spans all card rows */}
          <PullQuote variant="desktop" />

          {/* Graphic "06" block — sits to the right of builders-risk on row 3 */}
          <FadeUp className="col-4 start-7 ac-graphic" delay={0.32}>
            <div className="ac-graphic-block">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--paper)",
                }}
              >
                In the field
              </span>
              <span
                aria-hidden
                style={{
                  alignSelf: "center",
                  justifySelf: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(140px, 18vw, 280px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.06em",
                  color: "var(--paper)",
                  fontFeatureSettings: '"tnum" 1',
                }}
              >
                06
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ember-tint)",
                  textAlign: "right",
                }}
              >
                Classes written this issue
              </span>
            </div>
          </FadeUp>
        </div>
      </div>

      <style>{`
        /* ====== Card baseline ====== */
        .ac-card {
          position: relative;
          overflow: hidden;
          background: var(--paper-2);
          color: var(--ink);
          padding: 28px 24px;
          height: 100%;
          display: block;
        }
        .ac-card--featured {
          background: var(--ink);
          color: var(--paper);
          padding: 40px 36px;
        }
        .ac-card__inner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }
        .ac-card__head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-bottom: 1px solid currentColor;
          padding-bottom: 14px;
          color: var(--ink);
        }
        .ac-card--featured .ac-card__head { border-bottom-color: var(--paper-3); color: var(--paper); }
        .ac-card__eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ember);
        }
        .ac-card--featured .ac-card__eyebrow { color: var(--ember-tint); font-size: 12px; }
        .ac-card__index {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-3);
        }
        .ac-card--featured .ac-card__index { color: var(--paper-3); }
        .ac-card__title {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(22px, 2.4vw, 30px);
          line-height: 1.05;
          letter-spacing: -0.022em;
          color: var(--ink);
          text-wrap: balance;
        }
        .ac-card--featured .ac-card__title {
          font-size: clamp(36px, 4vw, 48px);
          color: var(--paper);
        }
        .ac-card__body {
          margin: 0;
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.6;
          color: var(--ink-2);
          text-wrap: pretty;
          max-width: 440px;
        }
        .ac-card--featured .ac-card__body {
          font-size: 17px;
          color: var(--paper-2);
        }
        .ac-card__cta {
          margin-top: auto;
          align-self: flex-start;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink);
          text-decoration: none;
          border-bottom: 1px solid var(--ink);
          padding-bottom: 2px;
        }
        .ac-card--featured .ac-card__cta { color: var(--paper); border-bottom-color: var(--paper); }

        /* ====== Ink L→R fill hover on non-featured cards ====== */
        .ac-card__fill {
          position: absolute;
          inset: 0;
          background: var(--ink);
          transform-origin: left center;
          transform: scaleX(0);
          transition: transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
          z-index: 1;
          pointer-events: none;
        }
        .ac-card:hover .ac-card__fill { transform: scaleX(1); }
        .ac-card:hover .ac-card__title,
        .ac-card:hover .ac-card__body,
        .ac-card:hover .ac-card__cta { color: var(--paper); transition: color 200ms cubic-bezier(0.2, 0.7, 0.2, 1); }
        .ac-card:hover .ac-card__head { border-bottom-color: var(--paper-3); transition: border-color 200ms cubic-bezier(0.2, 0.7, 0.2, 1); }
        .ac-card:hover .ac-card__eyebrow { color: var(--ember-tint); }
        .ac-card:hover .ac-card__index   { color: var(--paper-3); }
        .ac-card:hover .ac-card__cta     { border-bottom-color: var(--paper); }
        @media (prefers-reduced-motion: reduce) {
          .ac-card__fill { transition: none; }
          .ac-card:hover .ac-card__fill { transform: none; }
          .ac-card:hover { opacity: 0.85; transition: opacity 120ms linear; }
          .ac-card:hover .ac-card__title,
          .ac-card:hover .ac-card__body,
          .ac-card:hover .ac-card__cta { color: inherit !important; }
          .ac-card:hover .ac-card__head { border-color: currentColor !important; }
        }

        /* ====== Graphic "06" block — paper-on-pine, full row 3 right side ====== */
        .ac-graphic-block {
          background: var(--ember);
          color: var(--paper);
          min-height: 300px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 28px 24px;
          height: 100%;
        }

        /* ====== Pull-quote ====== */
        .pull-quote {
          font-family: var(--font-mono);
          font-size: var(--t-sm);
          line-height: 1.4;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .pull-quote--desktop {
          grid-column: 11 / span 2;
          grid-row: 1 / span 3;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 24px 0;
        }
        .pull-quote--desktop .pull-quote__inner {
          padding-block: 24px;
          border-top: 1px solid var(--ink);
          border-bottom: 1px solid var(--ink);
        }
        .pull-quote--mobile {
          display: none;
          padding-block: 24px;
          border-top: 1px solid var(--ink);
          border-bottom: 1px solid var(--ink);
          margin-bottom: 32px;
          text-align: center;
        }
        .pull-quote__inner > span {
          display: block;
        }

        /* ====== Mobile collapse ====== */
        @media (max-width: 768px) {
          .pull-quote--desktop { display: none; }
          .pull-quote--mobile  { display: block; }
          .ac-graphic { grid-column: 1 / -1 !important; }
        }
      `}</style>
    </section>
  );
}

function PullQuote({ variant }: { variant: "desktop" | "mobile" }) {
  const cls = variant === "desktop" ? "pull-quote pull-quote--desktop" : "pull-quote pull-quote--mobile";
  return (
    <div className={cls} aria-hidden>
      <div className="pull-quote__inner">
        <span>“Five-unit walk-ups</span>
        <span>to billion-dollar</span>
        <span>schedules.”</span>
      </div>
    </div>
  );
}

export const AssetClasses = AssetClassesGrid;
