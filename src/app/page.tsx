import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { CoverageSection } from "@/components/CoverageCards";
import { Position } from "@/components/Position";
import { AssetClassesGrid } from "@/components/AssetClasses";
import { CarrierBar } from "@/components/CarrierBar";
import { Process } from "@/components/Process";
import { FAQ } from "@/components/FAQ";
import { HOME_FAQ } from "@/lib/faq-data";
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
      <main id="main">
        <Hero />
        <CoverageSection />
        <Position />
        <AssetClassesGrid />
        <CarrierBar />
        <Process />
        <FAQ items={HOME_FAQ} />
      </main>
      <Footer />
    </>
  );
}
