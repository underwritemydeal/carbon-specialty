import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
import { AuthorBio, AUTHORS } from "@/components/AuthorBio";
import { CTAStrip } from "@/components/CTAStrip";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  breadcrumbs,
  personSchema,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "About — California-led, Western US specialists",
  description:
    "Carbon Specialty is California-led. Western US specialists in real estate and apartment building insurance. Founded by Robby Hess (20+ years commercial insurance) and Anthony Miller (30 years industry).",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          personSchema("robby-hess"),
          personSchema("anthony-miller"),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "About", href: "/about" },
          ]),
        ]}
      />
      <Header activePath="/about" />
      <main id="main">
        <Section
          number={1}
          eyebrow="About"
          headline={
            <>
              California-led. <em style={{ fontStyle: "italic" }}>Western US specialists.</em>
            </>
          }
          lede="Carbon Specialty is an independent insurance brokerage focused on real estate and apartment building insurance. Licensed across Arizona, California, Colorado, Idaho, Nevada, Oregon, Texas, Utah, and Washington. Depth over breadth — one specialty, one set of markets, one short list of carriers per asset class."
        >
          <div
            style={{
              borderTop: "1px solid var(--ink)",
              paddingTop: 32,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
            }}
            className="about-grid"
          >
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ember)",
                }}
              >
                Specialty
              </span>
              <p style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.6, color: "var(--ink-2)" }}>
                Real estate insurance — multifamily, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, and builders risk. No personal lines. No life. No generic small commercial.
              </p>
            </div>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ember)",
                }}
              >
                Geography
              </span>
              <p style={{ marginTop: 12, fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.6, color: "var(--ink-2)" }}>
                California, Arizona, Colorado, Idaho, Nevada, Oregon, Texas, Utah, Washington. Most of the book sits in California multifamily; the second-largest segment is mixed-use across the West.
              </p>
            </div>
            <style>{`
              @media (max-width: 700px) { .about-grid { grid-template-columns: 1fr !important; } }
            `}</style>
          </div>
        </Section>

        <Section
          number={2}
          eyebrow="02 — Founders"
          headline="Who's writing your policy."
          lede="Two co-founders. Combined 50+ years in commercial insurance, all of it on the real estate side."
        >
          <AuthorBio author={AUTHORS["robby-hess"]} />
          <AuthorBio author={AUTHORS["anthony-miller"]} />
        </Section>

        <CTAStrip />
      </main>
      <Footer />
    </>
  );
}
