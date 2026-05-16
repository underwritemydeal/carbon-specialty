import type { ReactNode } from "react";

export function Section({
  number,
  total = 6,
  eyebrow,
  headline,
  lede,
  id,
  children,
}: {
  number: number | string;
  total?: number;
  eyebrow: string;
  headline: ReactNode;
  lede?: ReactNode;
  id?: string;
  children?: ReactNode;
}) {
  const numStr = typeof number === "number" ? String(number).padStart(2, "0") : number;
  const totStr = String(total).padStart(2, "0");
  return (
    <section
      id={id}
      style={{
        padding: "96px var(--gutter)",
        borderBottom: "1px solid var(--ink)",
      }}
    >
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div
          className="section-head"
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr",
            gap: 32,
            marginBottom: 64,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              paddingTop: 8,
            }}
          >
            {numStr} /<br />
            {totStr}
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ember)",
              }}
            >
              {eyebrow}
            </span>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "var(--t-2xl)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
                maxWidth: 900,
              }}
            >
              {headline}
            </h2>
            {lede && (
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: "var(--ink-2)",
                  maxWidth: 640,
                  marginTop: 8,
                }}
              >
                {lede}
              </p>
            )}
          </div>
        </div>
        {children}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .section-head { grid-template-columns: 1fr !important; gap: 16px !important; }
        }
      `}</style>
    </section>
  );
}
