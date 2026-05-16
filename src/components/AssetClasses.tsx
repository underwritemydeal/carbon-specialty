import { Icon } from "./Icon";

export const ASSET_CLASSES = [
  {
    n: "01",
    slug: "multifamily",
    name: "Multifamily",
    body: "5 – 250 units · garden, low-rise, mid-rise, mid-century stucco, modern frame.",
  },
  {
    n: "02",
    slug: "mixed-use",
    name: "Mixed-use",
    body: "Retail + residential · ground-floor commercial · single-tenant or pad.",
  },
  {
    n: "03",
    slug: "sfr",
    name: "Single-family rentals",
    body: "SFR portfolios, 10 – 500 doors · scattered-site, master schedule.",
  },
  {
    n: "04",
    slug: "hoa",
    name: "Condo HOAs",
    body: "Master and walls-in · directors & officers · fidelity bond.",
  },
  {
    n: "05",
    slug: "small-commercial",
    name: "Small commercial real estate",
    body: "Strip retail · office · light industrial · owner-occupied.",
  },
  {
    n: "06",
    slug: "builders-risk",
    name: "Builders risk",
    body: "Ground-up multifamily · adaptive reuse · soft costs included.",
  },
] as const;

export function AssetClasses() {
  return (
    <div style={{ borderTop: "1px solid var(--ink)" }}>
      {ASSET_CLASSES.map((row) => (
        <a
          key={row.n}
          href={`/what-we-write#${row.slug}`}
          id={row.slug}
          className="asset-row"
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 2fr 40px",
            gap: 24,
            alignItems: "center",
            padding: "28px 8px",
            borderBottom: "1px solid var(--ink)",
            color: "var(--ink)",
            textDecoration: "none",
            transition: "background var(--dur-fast) var(--ease)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "var(--ink-3)",
            }}
          >
            {row.n}
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {row.name}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              lineHeight: 1.5,
              color: "var(--ink-2)",
            }}
          >
            {row.body}
          </span>
          <span style={{ justifySelf: "end", color: "var(--ink)" }}>
            <Icon name="arrow-right" size={18} />
          </span>
        </a>
      ))}
      <style>{`
        .asset-row:hover { background: var(--paper-2); }
        @media (max-width: 768px) {
          .asset-row {
            grid-template-columns: 48px 1fr !important;
            gap: 8px !important;
          }
          .asset-row > span:nth-child(3) { grid-column: 1 / -1; }
          .asset-row > span:nth-child(4) { display: none; }
        }
      `}</style>
    </div>
  );
}
