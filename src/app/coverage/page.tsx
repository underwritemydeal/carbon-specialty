import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { AskCarbonStrip } from "@/components/AskCarbonStrip";
import { COVERAGE_CHAPTERS } from "@/lib/coverage-chapters";
import { insuranceAgency, breadcrumbs } from "@/lib/schema";

/**
 * /coverage — sprint C.S.1.6.3.
 *
 * Editorial reference page for the full coverage menu Carbon places.
 * Twelve chapters in operator order (see `coverage-chapters.ts`).
 * No body CTAs; a single end-of-article `AskCarbonStrip` closes the
 * page with an editorial lede + "Ask Carbon →" link that opens the
 * chat for readers with a specific question. (Wrap-up revision —
 * the previous floating-bottom strip was swapped for natural flow.)
 *
 * Magazine layout cues:
 *   · 12-col grid, asymmetric per chapter (mono index → headline +
 *     body → marginalia → pagination marker)
 *   · Drop-cap on each body paragraph (Bodoni italic, scoped via
 *     `.drop-cap` class on the <p>)
 *   · Plex Mono pagination marker "NN / 12" bottom-right of each
 *     chapter
 *   · Hairline ink rule between chapters
 *   · Marginalia hidden ≤768px; chapter columns collapse to a single
 *     column on the same breakpoint
 */

const TOTAL = COVERAGE_CHAPTERS.length;
const TOTAL_STR = String(TOTAL).padStart(2, "0");

export const metadata: Metadata = {
  title: "Coverage — every line on the program, in plain English",
  description:
    "Twelve coverages Carbon Specialty places for real estate operators: property, GL, umbrella, workers' comp, EPLI, D&O, E&O, cyber, crime, pollution legal liability, hired and non-owned auto, and equipment breakdown. Editorial detail, no jargon dump.",
  alternates: { canonical: "/coverage" },
};

export default function CoveragePage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "Coverage", href: "/coverage" },
          ]),
        ]}
      />
      <Header activePath="/coverage" />
      <main id="main">
        {/* === Page lede === */}
        <section
          aria-labelledby="coverage-h1"
          style={{
            background: "var(--paper)",
            borderBottom: "1px solid var(--ink)",
            padding: "96px var(--gutter) 80px",
          }}
        >
          <div className="container" style={{ padding: 0 }}>
            <div
              className="coverage-lede-grid grid-12"
              style={{ alignItems: "baseline", rowGap: 24 }}
            >
              <span
                className="col-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--ember)",
                }}
              >
                The program
              </span>
              <span
                className="col-2 start-11 coverage-lede-pagination"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  textAlign: "right",
                }}
              >
                01 / {TOTAL_STR}
              </span>
              <h1
                id="coverage-h1"
                className="col-10 start-1 coverage-h1"
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(40px, 6.5vw, 88px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                  maxWidth: "18ch",
                  textWrap: "balance",
                }}
              >
                Coverage,{" "}
                <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
                  line by line.
                </em>
              </h1>
              <p
                className="col-8 start-1 coverage-lede"
                style={{
                  margin: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(17px, 1.6vw, 20px)",
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                  textWrap: "pretty",
                  maxWidth: "60ch",
                  marginTop: 8,
                }}
              >
                Twelve policies Carbon places for the real-estate operator —
                from the all-risk property form down to equipment breakdown.
                What each one actually covers, what it explicitly doesn&apos;t,
                and how it gets built before a specialist binds.
              </p>
            </div>
          </div>
        </section>

        {/* === Twelve chapters === */}
        <section
          aria-label="Coverage chapters"
          style={{ background: "var(--paper)" }}
        >
          <div className="container coverage-chapters">
            {COVERAGE_CHAPTERS.map((chapter, i) => {
              const pagination = `${chapter.index} / ${TOTAL_STR}`;
              const isLast = i === COVERAGE_CHAPTERS.length - 1;
              return (
                <article
                  key={chapter.index}
                  id={`ch-${chapter.index}`}
                  className="coverage-chapter grid-12"
                  style={{
                    alignItems: "flex-start",
                    columnGap: "var(--s-5)",
                    paddingBlock: "80px 80px",
                    borderBottom: isLast ? "none" : "1px solid var(--ink)",
                  }}
                >
                  {/* Chapter index — large mono numeral, left column */}
                  <div
                    className="col-2 coverage-chapter-index"
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 40,
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                      }}
                    >
                      {chapter.index}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "var(--ember)",
                      }}
                    >
                      {chapter.label}
                    </span>
                  </div>

                  {/* Headline + body — center column */}
                  <div
                    className="col-7 coverage-chapter-body"
                    style={{ display: "flex", flexDirection: "column", gap: 22 }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-display)",
                        fontWeight: 400,
                        fontSize: "clamp(28px, 3.2vw, 40px)",
                        lineHeight: 1.1,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                        textWrap: "balance",
                      }}
                    >
                      {chapter.headline}
                    </h2>
                    <p
                      className="drop-cap coverage-chapter-prose"
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-body)",
                        fontSize: 16,
                        lineHeight: 1.65,
                        color: "var(--ink-2)",
                        textWrap: "pretty",
                      }}
                    >
                      {chapter.body}
                    </p>
                  </div>

                  {/* Marginalia — right column, hidden ≤768px */}
                  <div className="col-3 start-10 coverage-chapter-marg">
                    <span className="marginalia">{chapter.marginalia}</span>
                  </div>

                  {/* Per-chapter pagination — bottom-right corner */}
                  <div
                    className="col-12 coverage-chapter-pagination"
                    style={{
                      marginTop: 16,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "var(--ink-3)",
                      }}
                    >
                      {pagination}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <AskCarbonStrip source="coverage" />
      </main>
      <Footer />

      <style>{`
        /* C.S.1.6.3 — chapter layout, mobile collapse, drop-cap scale. */
        .coverage-chapters {
          padding-block: 0;
        }
        @media (max-width: 768px) {
          .coverage-chapter .coverage-chapter-index,
          .coverage-chapter .coverage-chapter-body { grid-column: 1 / -1 !important; }
          .coverage-chapter-marg { display: none !important; }
          .coverage-chapter { padding-block: 56px 56px !important; }
          .coverage-chapter-index { flex-direction: row !important; align-items: baseline !important; gap: 14px !important; }
          .coverage-chapter-index span:first-child { font-size: 28px !important; }
        }
        @media (max-width: 480px) {
          /* Drop-cap scales down so it doesn't overrun the lede on
             phone widths. 3.5em × 16px ≈ 56px per the brief. */
          .coverage-chapter-prose.drop-cap::first-letter {
            font-size: 3.5em !important;
            line-height: 0.9 !important;
            margin-right: 0.1em !important;
          }
          /* Headline tightens so it stays ≤ 2 lines at typical
             chapter-headline lengths. */
          .coverage-chapter h2 {
            font-size: 26px !important;
            line-height: 1.12 !important;
          }
          .coverage-chapter { padding-block: 48px 48px !important; }
          .coverage-h1 {
            font-size: clamp(36px, 9vw, 56px) !important;
          }
          .coverage-lede {
            font-size: 16px !important;
          }
          .coverage-lede-pagination {
            grid-column: 1 / -1 !important;
            text-align: left !important;
            order: -1;
          }
        }
      `}</style>
    </>
  );
}
