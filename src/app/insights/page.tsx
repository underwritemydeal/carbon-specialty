import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { BottomCTA } from "@/components/BottomCTA";
import { JsonLd } from "@/components/JsonLd";
import { insuranceAgency, breadcrumbs } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Insights — Real estate insurance writing from Carbon Specialty",
  description:
    "Articles from Carbon Specialty on real estate insurance — earthquake DIC, habitational umbrella, vacant property, builders risk, mid-term broker-of-record changes.",
  alternates: { canonical: "/insights" },
};

export default function InsightsIndexPage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "Insights", href: "/insights" },
          ]),
        ]}
      />
      <Header activePath="/insights" />
      <main id="main">
        <PageHero
          eyebrow="Insights"
          headline="Notes from the"
          accent="underwriter's desk."
          lede="Carbon publishes practical writing on real estate insurance — earthquake DIC, habitational umbrella, vacant property, builders risk, mid-term broker-of-record changes — for investment property owners and operators nationwide."
        />

        <section className="cs-insights-placeholder" aria-labelledby="insights-placeholder-headline">
          <div className="container">
            <article className="cs-insights-placeholder__card">
              <span className="cs-insights-placeholder__eyebrow">No posts yet</span>
              <h2 id="insights-placeholder-headline" className="cs-insights-placeholder__headline">
                First article ships at launch.
              </h2>
              <p className="cs-insights-placeholder__body">
                Insights is the home for Carbon&apos;s long-form writing on
                real estate insurance. Articles will live at{" "}
                <code className="cs-insights-placeholder__code">/insights/[slug]</code> with
                Article schema and author bios on every post.
              </p>
            </article>
          </div>

          <style>{`
            .cs-insights-placeholder {
              background: var(--ink);
              color: var(--paper);
              padding: 80px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-insights-placeholder__card {
              border: 1px solid rgba(244,241,234,0.12);
              background: #0F1517;
              border-radius: 12px;
              padding: 56px 48px;
              display: flex;
              flex-direction: column;
              gap: 18px;
              max-width: 720px;
            }
            .cs-insights-placeholder__eyebrow {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-insights-placeholder__headline {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 36px;
              line-height: 1.1;
              letter-spacing: -0.02em;
              color: var(--paper);
              text-wrap: balance;
            }
            .cs-insights-placeholder__body {
              margin: 0;
              font-family: var(--font-body);
              font-size: 16px;
              line-height: 1.6;
              color: rgba(244,241,234,0.70);
              max-width: 60ch;
              text-wrap: pretty;
            }
            .cs-insights-placeholder__code {
              font-family: var(--font-mono);
              font-size: 14px;
              padding: 2px 6px;
              background: rgba(244,241,234,0.06);
              border-radius: 4px;
              color: rgba(244,241,234,0.85);
            }

            @media (max-width: 600px) {
              .cs-insights-placeholder { padding: 56px 0; }
              .cs-insights-placeholder__card { padding: 40px 24px; }
              .cs-insights-placeholder__headline { font-size: 28px; }
            }
          `}</style>
        </section>

        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
