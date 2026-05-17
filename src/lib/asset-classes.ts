// Server-safe data module — shared by the AssetClassesGrid component and
// the JSON-LD schema generators.

export const ASSET_CLASSES = [
  {
    n: "01",
    slug: "multifamily",
    name: "Multifamily",
    body: "5 – 250 units · garden, low-rise, mid-rise, mid-century stucco, modern frame.",
    span: 8,
  },
  {
    n: "02",
    slug: "mixed-use",
    name: "Mixed-use",
    body: "Retail + residential · ground-floor commercial · single-tenant or pad.",
    span: 4,
  },
  {
    n: "03",
    slug: "sfr",
    name: "Single-family rentals",
    body: "SFR portfolios, 10 – 500 doors · scattered-site, master schedule.",
    span: 5,
  },
  {
    n: "04",
    slug: "hoa",
    name: "Condo HOAs",
    body: "Master and walls-in · directors & officers · fidelity bond.",
    span: 4,
  },
  {
    n: "05",
    slug: "small-commercial",
    name: "Small commercial real estate",
    body: "Strip retail · office · light industrial · owner-occupied.",
    span: 6,
  },
  {
    n: "06",
    slug: "builders-risk",
    name: "Builders risk",
    body: "Ground-up multifamily · adaptive reuse · soft costs included.",
    span: 6,
  },
] as const;
