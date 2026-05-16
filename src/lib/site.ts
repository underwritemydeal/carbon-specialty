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
  // 9 licensed states — Western United States.
  areaServed: [
    { name: "Arizona", code: "US-AZ" },
    { name: "California", code: "US-CA" },
    { name: "Colorado", code: "US-CO" },
    { name: "Idaho", code: "US-ID" },
    { name: "Nevada", code: "US-NV" },
    { name: "Oregon", code: "US-OR" },
    { name: "Texas", code: "US-TX" },
    { name: "Utah", code: "US-UT" },
    { name: "Washington", code: "US-WA" },
  ],
  hoursOfOperation: "Mo-Fr 08:00-18:00",
  description:
    "Carbon Specialty is an independent insurance brokerage focused on real estate and apartment building insurance — multifamily, mixed-use, SFR portfolios, HOAs, and builders risk — across California and the Western United States.",
} as const;
