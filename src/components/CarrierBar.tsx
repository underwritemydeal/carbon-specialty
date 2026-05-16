import { FadeUp } from "./motion-primitives";

const PILLARS = [
  {
    eyebrow: "Admitted markets",
    word: "Standard.",
    body:
      "Where the schedule is clean and the carrier is comfortable. Most multifamily under 50 units lives here.",
  },
  {
    eyebrow: "Surplus lines",
    word: "Specialty.",
    body:
      "Where the standard market won't bind. Earthquake DIC, vacant property, prior-loss schedules, builders risk.",
  },
  {
    eyebrow: "Program business",
    word: "Scale.",
    body:
      "Where multi-building portfolios get rated as a class. Pre-negotiated terms, faster turnaround at renewal.",
  },
];

export function CarrierBar() {
  return (
    <section
      aria-labelledby="carrier-headline"
      style={{
        background: "var(--paper)",
        borderBottom: "1px solid var(--ink)",
        paddingBlock: "112px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle dot-grid background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--ink) 1px, transparent 0)",
          backgroundSize: "20px 20px",
          opacity: 0.05,
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative" }}>
        <FadeUp className="grid-12">
          <div className="col-6">
            <span className="page-no">04 — Carrier panel</span>
            <h2
              id="carrier-headline"
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(36px, 5.5vw, 64px)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
                textWrap: "balance",
              }}
            >
              Three markets.{" "}
              <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
                One short list per submission.
              </em>
            </h2>
          </div>
          <div className="col-5 start-8 carrier-marg">
            <span className="marginalia">
              The schedule decides the market. Each submission gets the carriers fluent in
              its asset class — no broader, no narrower.
            </span>
          </div>
        </FadeUp>

        <div className="rule" style={{ marginBlock: 80 }} />

        {/* Three pillars — 12-col grid with hairline vertical dividers between */}
        <div
          className="grid-12 carrier-pillars"
          style={{ alignItems: "stretch", columnGap: 0 }}
        >
          {PILLARS.map((p, i) => (
            <FadeUp
              key={p.eyebrow}
              className="col-4 pillar"
              delay={i * 0.07}
            >
              <article
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  paddingInline: 32,
                  paddingBlock: 16,
                  borderLeft: i > 0 ? "1px solid var(--ink)" : "none",
                  height: "100%",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--ember)",
                  }}
                >
                  {p.eyebrow}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: "clamp(48px, 6vw, 80px)",
                    lineHeight: 0.95,
                    letterSpacing: "-0.04em",
                    color: "var(--ink)",
                  }}
                >
                  {p.word}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "var(--ink-2)",
                    textWrap: "pretty",
                    maxWidth: 320,
                  }}
                >
                  {p.body}
                </p>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .carrier-pillars .pillar { grid-column: 1 / -1 !important; }
          .carrier-pillars .pillar article {
            border-left: none !important;
            border-top: 1px solid var(--ink);
            padding-inline: 0 !important;
            padding-block: 32px !important;
          }
          .carrier-pillars .pillar:first-child article { border-top: none; padding-top: 0 !important; }
          .carrier-marg { display: none; }
        }
      `}</style>
    </section>
  );
}
