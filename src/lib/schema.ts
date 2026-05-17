import { SITE } from "./site";
import { ASSET_CLASSES } from "@/lib/asset-classes";
import { HOME_FAQ } from "@/lib/faq-data";
import { AUTHORS } from "@/components/AuthorBio";

type Json = Record<string, unknown>;

export const ORG_ID = `${SITE.url}/#organization`;

function postalAddress() {
  return {
    "@type": "PostalAddress",
    streetAddress: SITE.street,
    addressLocality: SITE.city,
    addressRegion: SITE.region,
    postalCode: SITE.postalCode,
    addressCountry: SITE.country,
  } as Json;
}

function areaServed() {
  return SITE.areaServed.map((a) => ({
    "@type": "State",
    name: a.name,
    identifier: a.code,
  }));
}

// Sprint C.S.1.1 — telephone/email intentionally omitted from JSON-LD until
// real numbers exist. Restore by adding `telephone: SITE.phone, email: SITE.email`
// once SITE.phone and SITE.email are real values.
export function insuranceAgency(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    "@id": ORG_ID,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: `${SITE.url}/assets/logo-wordmark.svg`,
    image: `${SITE.url}/api/og?title=Carbon%20Specialty`,
    description: SITE.description,
    address: postalAddress(),
    areaServed: areaServed(),
    openingHours: SITE.hoursOfOperation,
    founder: SITE.founderNames.map((n) => ({ "@type": "Person", name: n })),
    sameAs: [],
    knowsAbout: [
      "Real estate insurance",
      "Apartment building insurance",
      "Multifamily property insurance",
      "Mixed-use commercial real estate insurance",
      "SFR portfolio insurance",
      "Condo HOA insurance",
      "Builders risk insurance",
      "Earthquake DIC",
      "Habitational umbrella",
    ],
  };
}

export function localBusiness(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.url}/#localbusiness`,
    name: SITE.name,
    url: SITE.url,
    address: postalAddress(),
    openingHours: SITE.hoursOfOperation,
    priceRange: "$$",
  };
}

export function website(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

export function breadcrumbs(items: { name: string; href: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.href.startsWith("http") ? it.href : `${SITE.url}${it.href}`,
    })),
  };
}

export function faqPage(items: { q: string; a: string }[] = HOME_FAQ): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function howToQuote(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Carbon Specialty's AI quote intake works",
    description:
      "Carbon's conversational AI quote tool captures the details of your real estate schedule and routes them to a licensed specialist for review and an indication.",
    tool: [{ "@type": "HowToTool", name: "Carbon AI agent" }],
    step: [
      { "@type": "HowToStep", position: 1, name: "Open chat", text: "Open the Carbon chat from the hero input or the Get-a-quote CTA." },
      { "@type": "HowToStep", position: 2, name: "Describe your building", text: "Tell Carbon about the asset — city, units, year built, current carrier — in your own words." },
      { "@type": "HowToStep", position: 3, name: "AI captures details", text: "Carbon's AI captures the structured intake data (asset class, address, units, renewal date, owner contact)." },
      { "@type": "HowToStep", position: 4, name: "Specialist reviews", text: "A licensed Carbon specialist reviews the submission and requests anything missing (rent rolls, loss runs, dec page)." },
      { "@type": "HowToStep", position: 5, name: "Specialist follow-up", text: "The specialist follows up with the indication and timing once underwriting has read the schedule and ordered carrier quotes." },
    ],
  };
}

export function webApplication(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Carbon AI quote intake",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE.url}/how-it-works`,
    publisher: { "@id": ORG_ID },
    description:
      "Conversational AI quote tool for commercial real estate insurance — multifamily, mixed-use, SFR, HOA, builders risk — across the Western United States.",
  };
}

export function insuranceService(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Real estate insurance quote service",
    serviceType: "Insurance Quote",
    provider: { "@id": ORG_ID },
    areaServed: areaServed(),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Asset classes Carbon writes",
      itemListElement: ASSET_CLASSES.map((a, i) => ({
        "@type": "Offer",
        position: i + 1,
        itemOffered: {
          "@type": "Service",
          name: `${a.name} insurance`,
          description: a.body,
        },
      })),
    },
  };
}

export function assetClassesItemList(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "What Carbon Specialty writes",
    itemListElement: ASSET_CLASSES.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.name,
      description: a.body,
      url: `${SITE.url}/what-we-write#${a.slug}`,
    })),
  };
}

export function personSchema(slug: keyof typeof AUTHORS): Json {
  const a = AUTHORS[slug];
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}/about#${slug}`,
    name: a.name,
    jobTitle: a.role,
    worksFor: { "@id": ORG_ID },
    description: a.bio,
    knowsAbout: a.expertise,
  };
}

export function article(opts: {
  slug: string;
  title: string;
  description: string;
  authorSlug: keyof typeof AUTHORS;
  datePublished: string;
  dateModified?: string;
}): Json {
  const a = AUTHORS[opts.authorSlug];
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: {
      "@type": "Person",
      "@id": `${SITE.url}/about#${opts.authorSlug}`,
      name: a.name,
    },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: `${SITE.url}/insights/${opts.slug}`,
    image: `${SITE.url}/api/og?title=${encodeURIComponent(opts.title)}`,
  };
}

/**
 * Inline JSON-LD <script> for use inside server components.
 * Pass one or more schemas; they will be emitted in a Graph wrapper.
 */
export function jsonLd(...schemas: Json[]): string {
  if (schemas.length === 1) return JSON.stringify(schemas[0]);
  return JSON.stringify({ "@context": "https://schema.org", "@graph": schemas });
}
