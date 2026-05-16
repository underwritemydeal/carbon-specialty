export function NotWrite() {
  return (
    <article
      className="card-inverted"
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 32,
        padding: "48px 40px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ember-tint)",
        }}
      >
        Out of scope
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          What Carbon doesn&apos;t write.
        </h3>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 32px",
            fontFamily: "var(--font-body)",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--paper-2)",
          }}
          className="notwrite-list"
        >
          <li>Personal auto and home</li>
          <li>Life and health</li>
          <li>Generic small commercial outside real estate</li>
          <li>Contractors / construction trades (we&apos;ll refer)</li>
          <li>Workers comp without an underlying real estate policy</li>
          <li>Anything that isn&apos;t a building or the entity that owns one</li>
        </ul>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--paper-3)",
            maxWidth: 680,
          }}
        >
          If it doesn&apos;t involve a multifamily, mixed-use, SFR portfolio, HOA, small commercial real estate, or builders-risk schedule, we&apos;ll refer you to an agency we trust. Depth over breadth.
        </p>
      </div>
      <style>{`
        @media (max-width: 700px) {
          article.card-inverted { grid-template-columns: 1fr !important; }
          .notwrite-list { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </article>
  );
}
