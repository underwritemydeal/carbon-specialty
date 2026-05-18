import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
import { AssetClasses } from "@/components/AssetClasses";
import { ASSET_CLASSES } from "@/lib/asset-classes";
import { NotWrite } from "@/components/NotWrite";
import { CTAStrip } from "@/components/CTAStrip";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  breadcrumbs,
  assetClassesItemList,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "What we write — asset classes Carbon insures",
  description:
    "Carbon Specialty writes real estate insurance across six asset classes for investment property owners: multifamily, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, and builders risk. Nationwide.",
  alternates: { canonical: "/what-we-write" },
};

export default function WhatWeWritePage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          assetClassesItemList(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "What we write", href: "/what-we-write" },
          ]),
        ]}
      />
      <Header activePath="/what-we-write" />
      <main id="main">
        <Section
          number={1}
          eyebrow="What we write"
          headline={
            <>
              Buildings, owners, and the policies they need.
            </>
          }
          lede="Carbon Specialty writes real estate insurance for multifamily and apartment buildings, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, and builders risk — for investment property owners nationwide."
        >
          <AssetClasses />
        </Section>

        <Section
          number={2}
          eyebrow="02 — Detail by asset class"
          headline="The schedule decides the carrier."
          lede="Each asset class has a different short-list of carriers, different exclusions to read, and a different submission to assemble."
        >
          <div style={{ display: "grid", gap: 48 }}>
            {ASSET_CLASSES.map((a) => (
              <article
                key={a.slug}
                id={a.slug}
                style={{
                  borderTop: "1px solid var(--ink)",
                  paddingTop: 32,
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 2fr",
                  gap: 32,
                }}
                className="ac-row"
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    color: "var(--ink-3)",
                  }}
                >
                  {a.n}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: 36,
                    lineHeight: 1.05,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {a.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-body)",
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: "var(--ink-2)",
                  }}
                >
                  {a.body}
                </p>
              </article>
            ))}
            <style>{`
              @media (max-width: 768px) {
                .ac-row { grid-template-columns: 1fr !important; gap: 12px !important; }
              }
            `}</style>
          </div>
        </Section>

        <Section
          number={3}
          eyebrow="03 — Out of scope"
          headline="What Carbon doesn't write."
          lede="Depth, not breadth. If your need falls outside, we'll refer you to someone we trust."
        >
          <NotWrite />
        </Section>

        <CTAStrip />
      </main>
      <Footer />
    </>
  );
}
