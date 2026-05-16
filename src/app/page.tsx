import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Section } from "@/components/Section";
import { CoverageCards } from "@/components/CoverageCards";
import { CarrierBar } from "@/components/CarrierBar";
import { Positioning } from "@/components/Stats";
import { AssetClasses } from "@/components/AssetClasses";
import { Process } from "@/components/Process";
import { FAQ, HOME_FAQ } from "@/components/FAQ";
import { CTAStrip } from "@/components/CTAStrip";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  localBusiness,
  website,
  breadcrumbs,
  faqPage,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "Real estate and apartment building insurance — California & the Western US",
  description:
    "Carbon Specialty is an independent insurance brokerage focused on real estate insurance for multifamily, mixed-use, SFR portfolios, HOAs, and apartment buildings across California and the Western United States.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          localBusiness(),
          website(),
          breadcrumbs([{ name: "Home", href: "/" }]),
          faqPage(HOME_FAQ),
        ]}
      />
      <Header activePath="/" />
      <main id="main">
        <Hero />
        <Section
          number={1}
          eyebrow="01 — Coverage"
          headline={
            <>
              Property &amp; liability for the building <em style={{ fontStyle: "italic" }}>and</em> the operation.
            </>
          }
          lede="All-risk property, GL, umbrella, EPLI, EQ. One schedule per asset."
        >
          <CoverageCards />
        </Section>
        <CarrierBar />
        <Positioning />
        <Section
          number={4}
          eyebrow="04 — What we write"
          headline={
            <>
              One asset class. <em style={{ fontStyle: "italic" }}>One specialty.</em>
            </>
          }
          lede="Multifamily, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, builders risk."
        >
          <AssetClasses />
        </Section>
        <Section
          number={5}
          eyebrow="05 — Process"
          headline="Intake, underwriting, bind."
          lede="Three stages. The chat (or the form) handles the first."
        >
          <Process />
        </Section>
        <Section
          number={6}
          eyebrow="06 — FAQ"
          headline="Questions we hear from operators."
          lede="The answers below are draft copy under broker review."
        >
          <FAQ items={HOME_FAQ} />
        </Section>
        <CTAStrip />
      </main>
      <Footer />
    </>
  );
}
