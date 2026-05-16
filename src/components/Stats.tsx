// Replaced fabricated quantitative claims (sprint C.S.1.1).
// Qualitative positioning, hairline index-card pattern.
// DRAFT — broker review required before launch.

const ITEMS = [
  {
    n: "01",
    eyebrow: "Specialty",
    title: "Real estate is what we do.",
    body:
      "Not one of many things. Asset-class focus changes how a submission reads and how markets respond.",
  },
  {
    n: "02",
    eyebrow: "Geography",
    title: "California-led, Western states-licensed.",
    body:
      "Licensed across nine Western states. One operational footprint, one team — not a national chain pretending at depth.",
  },
  {
    n: "03",
    eyebrow: "Speed",
    title: "AI-assisted intake, specialist underwriting.",
    body:
      "Structured submissions reach the underwriter ready to read. Faster than the standard agency cycle.",
  },
];

export function Positioning() {
  return (
    <section
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        padding: "112px var(--gutter)",
        borderBottom: "1px solid var(--ink)",
      }}
    >
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 64,
            paddingBottom: 16,
            borderBottom: "1px solid var(--paper-3)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ember)",
            }}
          >
            03 — Positioning
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--paper-3)",
            }}
          >
            How Carbon sits in the market
          </span>
        </div>

        <div
          className="positioning-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}
        >
          {ITEMS.map((it, i) => (
            <article
              key={it.n}
              style={{
                padding: "0 40px",
                borderRight: i < ITEMS.length - 1 ? "1px solid var(--paper-3)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ember)",
                }}
              >
                {it.n} — {it.eyebrow}
              </span>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(28px, 3.4vw, 36px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "var(--paper)",
                }}
              >
                {it.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--paper-2)",
                  maxWidth: 360,
                }}
              >
                {it.body}
              </p>
            </article>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .positioning-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .positioning-grid article { border-right: none !important; padding: 32px 0 !important; border-top: 1px solid var(--paper-3); }
          .positioning-grid article:first-child { border-top: none; padding-top: 0 !important; }
        }
      `}</style>
    </section>
  );
}
