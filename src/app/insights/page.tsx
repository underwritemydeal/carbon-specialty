import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
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
        <Section
          number={1}
          eyebrow="Insights"
          headline={
            <>
              Notes from the <em style={{ fontStyle: "italic" }}>underwriter&apos;s desk</em>.
            </>
          }
          lede="Carbon Specialty publishes practical writing on real estate insurance — earthquake DIC, habitational umbrella, vacant property, builders risk, mid-term broker-of-record changes — for investment property owners and operators nationwide."
        >
          <article
            className="card"
            style={{
              padding: "48px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ember)",
              }}
            >
              No posts yet
            </span>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: 32,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              First article ships at launch.
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-body)",
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--ink-2)",
                maxWidth: 640,
              }}
            >
              Insights is the home for Carbon&apos;s long-form writing on real estate insurance. Articles will live at <code style={{ fontFamily: "var(--font-mono)" }}>/insights/[slug]</code> with Article schema and author bios on every post.
            </p>
          </article>
        </Section>
      </main>
      <Footer />
    </>
  );
}
