export const SITE = {
  name: "Carbon Specialty",
  legalName: "Carbon Specialty Insurance Services",
  domain: "carbonspecialty.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://carbonspecialty.com",
  // Sprint C.S.1.1 — public phone and email are placeholders until launch.
  // Do NOT emit these into JSON-LD, footer links, or other surfaces. Helpers
  // in `schema.ts` already omit them; new surfaces should keep that rule.
  phone: null,
  phoneDisplay: null,
  email: null,
  street: "Long Beach, California",
  city: "Long Beach",
  region: "CA",
  postalCode: "90802",
  country: "US",
  founderNames: ["Robby Hess", "Anthony Miller"],
  // C.S.1.6.5 — Service area is nationwide. Carbon places real estate
  // insurance for investment property owners in every region of the
  // country, via direct admitted appointments where available and
  // wholesale/program partners where they're not. The literal direct-
  // appointment license-state enumeration remains in /terms (legal
  // statement of fact); this SITE.areaServed drives JSON-LD service-
  // area, which reflects the broader placement footprint.
  areaServed: [
    { name: "United States", code: "US" },
  ],
  hoursOfOperation: "Mo-Fr 08:00-18:00",
  description:
    "Carbon Specialty is an independent insurance brokerage specializing in real estate insurance for investment property owners — multifamily, mixed-use, SFR portfolios, HOAs, small commercial real estate, and builders risk — nationwide.",
} as const;
