import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HeroLede } from "@/components/HeroLede";
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
  title: "Real estate insurance for investment property owners — nationwide",
  description:
    "Carbon Specialty specializes in real estate insurance for investment property owners. Five units to billion-dollar schedules — multifamily, mixed-use, SFR portfolios, HOAs, and apartment buildings, nationwide.",
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
        <HeroLede />
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
