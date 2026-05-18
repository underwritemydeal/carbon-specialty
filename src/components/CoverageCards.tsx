import Link from "next/link";
import { FadeUp } from "./motion-primitives";

// C.S.1.6.3 — Condensed to three umbrellas. The single editorial
// sentence per chapter hints at depth without enumerating; the full
// twelve-coverage menu lives on /coverage and is reached via the
// "All coverages →" link below the third chapter (replacing the old
// per-chapter "Coverage detail →" links).
const ITEMS = [
  {
    index: "01",
    eyebrow: "Property",
    title: "All-risk on the schedule.",
    body:
      "Replacement cost, agreed value, ordinance and law — with EQ and flood placed through the surplus-lines market where the standard carriers won't bind.",
    marginalia: "Replacement cost · agreed value · ordinance & law",
  },
  {
    index: "02",
    eyebrow: "Liability",
    title: "GL, umbrella, and the policies above.",
    body:
      "Per-location $1M / $2M baseline scaled into $25M+ habitational umbrellas, with exclusions read line by line before anything gets bound.",
    marginalia: "GL · umbrella · excess · habitational EPLI",
  },
  {
    index: "03",
    eyebrow: "Specialty & Operations",
    title: "Workers' comp, D&O, cyber, equipment breakdown.",
    body:
      "Nine more lines — workers' comp through equipment breakdown — written deliberately for the operating entity that stands behind the building.",
    marginalia: "Workers' comp · D&O · cyber · equipment breakdown",
  },
];

export function CoverageSection() {
  return (
    <section
      id="coverage"
      className="paper-grain"
      style={{
        background: "var(--paper)",
        borderBottom: "1px solid var(--ink)",
        paddingBlock: "112px 128px",
        position: "relative",
      }}
    >
      <div className="container" style={{ position: "relative" }}>
        {/* Section index + eyebrow */}
        <FadeUp className="grid-12" as="div">
          <div className="col-2">
            <span className="page-no">01 — Coverage</span>
          </div>
          <div className="col-10">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ember)",
              }}
            >
              Chapter One
            </span>
          </div>
        </FadeUp>

        {/* Section headline at website (not poster) scale */}
        <FadeUp className="coverage-headline" delay={0.08}>
          <h2
            style={{
              margin: "16px 0 64px",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              maxWidth: "22ch",
              textWrap: "balance",
            }}
          >
            Property &amp; liability for{" "}
            <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
              the building and the operation.
            </em>
          </h2>
        </FadeUp>

        {/* THREE SUBSECTIONS — 12 col grid with marginalia on the right */}
        <div className="rule" style={{ marginBottom: 48 }} />
        <div
          className="grid-12 coverage-subs"
          style={{
            rowGap: 96,
          }}
        >
          {ITEMS.map((item) => (
            <FadeUp key={item.index} className="col-12">
              <article
                className="grid-12 coverage-row"
                style={{
                  alignItems: "flex-start",
                  columnGap: "var(--s-5)",
                }}
              >
                {/* mono index */}
                <div className="col-1">
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                    }}
                  >
                    {item.index}
                  </span>
                </div>

                {/* Headline + body */}
                <div className="col-7" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "var(--ember)",
                    }}
                  >
                    {item.eyebrow}
                  </span>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontWeight: 400,
                      fontSize: "clamp(28px, 3.4vw, 40px)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                      color: "var(--ink)",
                      textWrap: "balance",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="drop-cap"
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-body)",
                      fontSize: 16,
                      lineHeight: 1.65,
                      color: "var(--ink-2)",
                      textWrap: "pretty",
                    }}
                  >
                    {item.body}
                  </p>
                </div>

                {/* Marginalia */}
                <div className="col-3 start-10 coverage-marg">
                  <span className="marginalia">{item.marginalia}</span>
                </div>
              </article>
            </FadeUp>
          ))}
        </div>

        {/* C.S.1.6.3 — Single "All coverages →" link below the third
            chapter. Replaces the per-chapter "Coverage detail →"
            links that previously pointed to /what-we-write. Anchored
            to the new /coverage editorial page. */}
        <FadeUp
          className="grid-12 coverage-all"
          as="div"
          delay={0.05}
        >
          <div
            className="col-7 start-2"
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <Link
              href="/coverage"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ink)",
                textDecoration: "none",
                borderBottom: "1px solid var(--ink)",
                paddingBottom: 4,
              }}
            >
              All coverages
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="4" y1="12" x2="20" y2="12" />
                <polyline points="14 6 20 12 14 18" />
              </svg>
            </Link>
          </div>
        </FadeUp>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .coverage-row .col-7,
          .coverage-row .col-1,
          .coverage-row .col-3 { grid-column: 1 / -1 !important; }
          .coverage-marg { display: none; }
          .coverage-h2-line2 { padding-left: 0 !important; }
          /* The "All coverages →" link unindents on mobile so it sits
             flush-left with the chapter bodies rather than the
             desktop col-2 start. */
          .coverage-all .col-7 { grid-column: 1 / -1 !important; }
        }
      `}</style>
    </section>
  );
}
