import { FadeUp } from "./motion-primitives";

const ITEMS = [
  {
    index: "01",
    eyebrow: "Property",
    title: "All-risk property on the schedule.",
    body:
      "Replacement cost, agreed value, ordinance & law. Earthquake and flood placed via E&S where the standard market won’t bind. Schedules read line-by-line; exclusions get translated before they get signed.",
    marginalia: "Replacement cost · agreed value · ordinance & law",
    link: "Coverage detail",
  },
  {
    index: "02",
    eyebrow: "Liability",
    title: "GL, umbrella, and the policies that sit above.",
    body:
      "Per-location $1M / $2M baseline. Umbrellas from $5M to $25M layered across multi-building schedules. Habitational exclusions read line-by-line; the policy you don’t notice until you do.",
    marginalia: "GL · umbrella · excess · habitational EPLI",
    link: "Coverage detail",
  },
  {
    index: "03",
    eyebrow: "Operations",
    title: "EPLI, hired and non-owned auto, equipment breakdown.",
    body:
      "The policies you forget about until a tenant hires an attorney or the chiller dies in August. Quiet coverage, written deliberately and reviewed at every renewal.",
    marginalia: "EPLI · HNOA · equipment breakdown",
    link: "Coverage detail",
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
                  <a
                    href="/what-we-write"
                    style={{
                      alignSelf: "flex-start",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--ink)",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--ink)",
                      paddingBottom: 2,
                    }}
                  >
                    {item.link} →
                  </a>
                </div>

                {/* Marginalia */}
                <div className="col-3 start-10 coverage-marg">
                  <span className="marginalia">{item.marginalia}</span>
                </div>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .coverage-row .col-7,
          .coverage-row .col-1,
          .coverage-row .col-3 { grid-column: 1 / -1 !important; }
          .coverage-marg { display: none; }
          .coverage-h2-line2 { padding-left: 0 !important; }
        }
      `}</style>
    </section>
  );
}
