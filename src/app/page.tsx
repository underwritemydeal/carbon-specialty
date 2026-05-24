import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { CoverageSection } from "@/components/CoverageSection";
import { BottomCTA } from "@/components/BottomCTA";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { HOME_FAQ } from "@/lib/faq-data";
import {
  insuranceAgency,
  localBusiness,
  website,
  breadcrumbs,
  faqPage,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "Insurance for real estate investors — Carbon Specialty",
  description:
    "Carbon Specialty turns the conversation into a clean property submission and connects you with real coverage options from a specialist. Multifamily, mixed-use, SFR portfolios, HOAs, and apartments — nationwide.",
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
        <HowItWorks />
        <CoverageSection />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
