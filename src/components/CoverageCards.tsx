import { Icon } from "./Icon";

const ITEMS = [
  {
    tag: "01 — Property",
    title: "All-risk property on the schedule.",
    body: "Replacement cost, agreed value, ordinance & law. Earthquake and flood placed via E&S where the standard market won't bind.",
    kind: "hairline" as const,
  },
  {
    tag: "02 — Liability",
    title: "GL, umbrella, and the policies that sit above.",
    body: "Per-location $1M / $2M baseline. $5M–$25M umbrellas across multi-building schedules. Habitational exclusions read line-by-line.",
    kind: "inverted" as const,
  },
  {
    tag: "03 — Operations",
    title: "EPLI, hired & non-owned auto, equipment breakdown.",
    body: "The policies you forget about until a tenant hires an attorney or the chiller dies in August.",
    kind: "index" as const,
  },
];

export function CoverageCards() {
  return (
    <div
      className="coverage-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0,
        borderTop: "1px solid var(--ink)",
      }}
    >
      {ITEMS.map((it, i) => {
        const inverted = it.kind === "inverted";
        const index = it.kind === "index";
        return (
          <article
            key={it.tag}
            style={{
              background: inverted ? "var(--ink)" : "var(--paper)",
              color: inverted ? "var(--paper)" : "var(--ink)",
              padding: index ? "32px 28px" : "40px 32px",
              borderRight: i < ITEMS.length - 1 ? "1px solid var(--ink)" : "none",
              borderTop: index ? "1px solid var(--ember)" : "none",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              minHeight: 320,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: inverted ? "var(--paper-3)" : "var(--ink-3)",
              }}
            >
              {it.tag}
            </span>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: 30,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {it.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-body)",
                fontSize: 14,
                lineHeight: 1.55,
                color: inverted ? "var(--paper-2)" : "var(--ink-2)",
                flex: 1,
              }}
            >
              {it.body}
            </p>
            <a
              href="/what-we-write"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "inherit",
                textDecoration: "none",
                borderBottom: "1px solid currentColor",
                paddingBottom: 2,
                alignSelf: "flex-start",
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              Coverage detail <Icon name="arrow-right" size={12} />
            </a>
          </article>
        );
      })}
      <style>{`
        @media (max-width: 900px) {
          .coverage-grid { grid-template-columns: 1fr !important; }
          .coverage-grid article { border-right: none !important; border-bottom: 1px solid var(--ink); }
        }
      `}</style>
    </div>
  );
}
