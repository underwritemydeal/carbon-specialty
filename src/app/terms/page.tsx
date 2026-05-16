import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
import { JsonLd } from "@/components/JsonLd";
import { insuranceAgency, breadcrumbs } from "@/lib/schema";
import { DraftBanner } from "../privacy/page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Carbon Specialty terms of service — template, currently under lawyer review.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "Terms", href: "/terms" },
          ]),
        ]}
      />
      <Header />
      <main id="main">
        <Section
          number={1}
          eyebrow="Terms"
          headline="Terms of service."
          lede="The rules of the road for using carbonspecialty.com and the Carbon AI quote intake."
        >
          <DraftBanner />
          <article
            style={{
              maxWidth: 760,
              fontFamily: "var(--font-body)",
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--ink-2)",
              display: "grid",
              gap: 24,
            }}
          >
            <section>
              <H3>1. No coverage until bound</H3>
              <p>
                Nothing on this site, in the Carbon chat, or in the quote form constitutes a
                binder, a quote, or a contract of insurance. Coverage exists only when a
                Carbon-issued binder or policy is in force.
              </p>
            </section>
            <section>
              <H3>2. The AI quote intake is intake only</H3>
              <p>
                Carbon&apos;s conversational AI captures information and routes it to a licensed
                specialist. It does not bind coverage, calculate premium, or make underwriting
                decisions. All quotes are issued by a licensed Carbon Specialty representative.
              </p>
            </section>
            <section>
              <H3>3. Information you provide</H3>
              <p>
                You agree the information you provide is accurate to the best of your knowledge.
                Material misrepresentation can affect coverage and claims. See the privacy
                policy for how we handle the information.
              </p>
            </section>
            <section>
              <H3>4. License & jurisdiction</H3>
              <p>
                Carbon Specialty Insurance Services is a California-licensed independent
                insurance brokerage, licensed in nine Western states (AZ, CA, CO, ID, NV, OR,
                TX, UT, WA). These terms are governed by California law.
              </p>
            </section>
            <section>
              <H3>5. Contact</H3>
              <p>
                Carbon Specialty Insurance Services · Long Beach, California. Direct email is
                launching with the public site.
              </p>
            </section>
          </article>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: 0,
        marginBottom: 8,
        fontFamily: "var(--font-display)",
        fontWeight: 400,
        fontSize: 24,
        lineHeight: 1.2,
        letterSpacing: "-0.01em",
        color: "var(--ink)",
      }}
    >
      {children}
    </h3>
  );
}
