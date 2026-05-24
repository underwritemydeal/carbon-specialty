import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { QuoteForm } from "@/components/QuoteForm";
import { BottomCTA } from "@/components/BottomCTA";
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
    "Three-step quote form for real estate and apartment building insurance — the asset, the owner, the coverages. Alternative to the Carbon AI chat.",
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
        <PageHero
          eyebrow="Quote"
          headline="Three steps to an"
          accent="indication."
          lede="Prefer the form over the chat? Same submission goes to the same specialist. Carbon shares an indication of pricing on submit; a licensed specialist follows up with firm, bind-eligible pricing."
        />

        <section className="cs-quote-wrap" aria-labelledby="quote-form-headline">
          <div className="container">
            <h2 id="quote-form-headline" className="sr-only">
              Three-step quote form
            </h2>
            {/* Paper card on dark — the form internals stay light because
                a structured fill-in flow reads more naturally on paper.
                The card sits as a deliberate paper surface inside the
                dark page chrome, the way the homepage console sits as a
                deliberate dark surface inside the dark hero. */}
            <div className="cs-quote-card">
              <QuoteForm />
            </div>
          </div>

          <style>{`
            .cs-quote-wrap {
              background: var(--ink);
              padding: 80px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-quote-card {
              background: var(--paper);
              border: 1px solid rgba(244,241,234,0.12);
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 24px 64px rgba(0,0,0,0.4);
            }
            @media (max-width: 768px) {
              .cs-quote-wrap { padding: 56px 0; }
              .cs-quote-card { border-radius: 8px; }
            }
            @media (max-width: 480px) {
              .cs-quote-wrap { padding: 40px 0; }
            }
          `}</style>
        </section>

        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
