const STEPS = [
  {
    n: "01",
    title: "Intake",
    body:
      "Tell Carbon about the building — asset class, address, units, year built, current carrier. Two minutes in chat or three short form steps.",
  },
  {
    n: "02",
    title: "Underwriting",
    body:
      "A specialist reads the schedule, requests anything missing (rent rolls, loss runs, dec page), and orders quotes from the carriers active on your asset class.",
  },
  {
    n: "03",
    title: "Bind & service",
    body:
      "We compare options line-by-line, recommend the best fit, bind coverage, and handle endorsements, COIs, and renewals from there.",
  },
];

export function Process() {
  return (
    <div
      className="process-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0,
        borderTop: "1px solid var(--ink)",
      }}
    >
      {STEPS.map((s, i) => (
        <article
          key={s.n}
          style={{
            padding: "40px 32px",
            borderRight: i < STEPS.length - 1 ? "1px solid var(--ink)" : "none",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            minHeight: 260,
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
            {s.n} — Step
          </span>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: 32,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {s.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-body)",
              fontSize: 15,
              lineHeight: 1.55,
              color: "var(--ink-2)",
            }}
          >
            {s.body}
          </p>
        </article>
      ))}
      <style>{`
        @media (max-width: 900px) {
          .process-grid { grid-template-columns: 1fr !important; }
          .process-grid article { border-right: none !important; border-bottom: 1px solid var(--ink); }
        }
      `}</style>
    </div>
  );
}
