const ROWS: [string, string][] = [
  ["$2.4B", "Total insured value, in-force"],
  ["60+", "A-rated carrier markets"],
  ["48h", "Median bind time, complete submission"],
  ["97%", "Renewal retention, 2025"],
];

export function Stats() {
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
            03 — In numbers
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
            As of 2026-Q1
          </span>
        </div>
        <div
          className="stats-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}
        >
          {ROWS.map(([n, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(56px, 9vw, 112px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                  color: "var(--paper)",
                }}
              >
                {n}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: "var(--paper-2)",
                  maxWidth: 200,
                }}
              >
                {l}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  );
}
