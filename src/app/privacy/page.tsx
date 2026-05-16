import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
import { JsonLd } from "@/components/JsonLd";
import { insuranceAgency, breadcrumbs } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Carbon Specialty privacy policy — CCPA-aligned template, currently under lawyer review.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "Privacy", href: "/privacy" },
          ]),
        ]}
      />
      <Header />
      <main id="main">
        <Section
          number={1}
          eyebrow="Privacy"
          headline="Privacy policy."
          lede="What we collect, why, and your CCPA rights as a California resident."
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
              <H3>1. Information we collect</H3>
              <p>
                When you use the Carbon AI quote intake or submit the quote form, we collect the
                property and contact details you provide (asset class, address, units, year built,
                replacement cost, current carrier, renewal date, owner entity, contact name, email,
                phone). When you browse the site, we collect analytics events via PostHog (page
                views, button clicks, form steps) tied to a pseudonymous device ID.
              </p>
            </section>
            <section>
              <H3>2. How we use it</H3>
              <p>
                Submission data goes to a Carbon Specialty licensed insurance specialist for
                underwriting and follow-up. Analytics data is used to improve the site and the
                quote flow. We do not sell personal information.
              </p>
            </section>
            <section>
              <H3>3. Your CCPA rights</H3>
              <p>
                California residents have the right to know what we collect, request deletion,
                opt out of sale or sharing of personal information, correct inaccuracies, and
                limit the use of sensitive personal information. To exercise any of these rights,
                email <a href="mailto:hello@carbonspecialty.com" className="link">hello@carbonspecialty.com</a>.
              </p>
            </section>
            <section>
              <H3>4. Cookies</H3>
              <p>
                We use a small number of first-party cookies for analytics and a session cookie
                for the Carbon chat. The cookie banner at the bottom of every page lets you
                accept or reject analytics cookies.
              </p>
            </section>
            <section>
              <H3>5. Contact</H3>
              <p>
                Carbon Specialty Insurance Services · Long Beach, California ·{" "}
                <a href="mailto:hello@carbonspecialty.com" className="link">hello@carbonspecialty.com</a>
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

export function DraftBanner() {
  return (
    <aside
      role="note"
      style={{
        border: "1px solid var(--warn)",
        background: "var(--paper-2)",
        padding: "12px 16px",
        marginBottom: 32,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.06em",
        color: "var(--ink-2)",
      }}
    >
      <strong style={{ color: "var(--warn)" }}>DRAFT — LAWYER REVIEW REQUIRED.</strong>{" "}
      This page is a template. Have insurance counsel review before relying on it.
    </aside>
  );
}
