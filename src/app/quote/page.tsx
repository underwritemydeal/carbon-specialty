import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
import { QuoteForm } from "@/components/QuoteForm";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  breadcrumbs,
  insuranceService,
} from "@/lib/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get a quote — three-step submission",
  description:
    "Three-step quote form for real estate and apartment building insurance — the asset, the owner, the coverages. Alternative to the Carbon AI chat. Median bind 48 hours.",
  alternates: { canonical: "/quote" },
  robots: { index: true, follow: true },
};

export default function QuotePage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          insuranceService(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "Get a quote", href: "/quote" },
          ]),
        ]}
      />
      <Header activePath="/quote" />
      <main id="main">
        <Section
          number={0}
          eyebrow="Quote"
          headline={
            <>
              Three steps to an <em style={{ fontStyle: "italic" }}>indication</em>.
            </>
          }
          lede="Prefer the form over the chat? Same submission goes to the same specialist. Median bind 48 hours from a complete submission."
        />
        <QuoteForm />
      </main>
      <Footer />
    </>
  );
}
