export function CarrierBar() {
  return (
    <section
      style={{
        borderBottom: "1px solid var(--ink)",
        padding: "32px var(--gutter)",
        background: "var(--paper-2)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 48,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            flexShrink: 0,
          }}
        >
          Carrier panel
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 22,
            color: "var(--ink-2)",
            letterSpacing: "-0.01em",
          }}
        >
          A-rated admitted, surplus-lines, and program-business carriers — the short list for any given submission is determined by the schedule.
        </p>
      </div>
    </section>
  );
}
