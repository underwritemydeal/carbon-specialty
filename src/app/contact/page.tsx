import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { BottomCTA } from "@/components/BottomCTA";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  localBusiness,
  breadcrumbs,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "Contact — Office, hours, licensure",
  description:
    "Carbon Specialty office, hours, and licensure. Direct phone and email are launching with the public site — use the Carbon chat or the quote form for inquiries today.",
  alternates: { canonical: "/contact" },
};

const ROWS: Array<{ label: string; value: React.ReactNode }> = [
  { label: "Phone", value: "Launching soon — use the chat or quote form." },
  { label: "Email", value: "Launching soon — use the quote form." },
  { label: "Hours", value: "Mon – Fri · 8a – 6p Pacific" },
  { label: "Office", value: "Long Beach, California" },
  { label: "Licensed", value: "AZ · CA · CO · ID · NV · OR · TX · UT · WA" },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          localBusiness(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "Contact", href: "/contact" },
          ]),
        ]}
      />
      <Header activePath="/contact" />
      <main id="main">
        <PageHero
          eyebrow="Contact"
          headline="Reach Carbon."
          accent="Directly."
          lede="No tickets, no chatbot tree (other than the one on the homepage, which is voluntary). Direct phone and email are launching with the public site — until then, the Carbon chat or the quote form reaches a specialist."
        />

        <section className="cs-contact-rows" aria-labelledby="contact-rows-headline">
          <div className="container">
            <h2 id="contact-rows-headline" className="sr-only">
              Office, hours, and licensure
            </h2>
            <dl className="cs-contact-rows__dl">
              {ROWS.map(({ label, value }) => (
                <div key={label} className="cs-contact-rows__row">
                  <dt className="cs-contact-rows__label">{label}</dt>
                  <dd className="cs-contact-rows__value">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <style>{`
            .cs-contact-rows {
              background: var(--ink);
              color: var(--paper);
              padding: 64px 0 96px;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-contact-rows__dl {
              margin: 0;
              padding: 0;
              border-top: 1px solid rgba(244,241,234,0.10);
            }
            .cs-contact-rows__row {
              display: grid;
              grid-template-columns: 180px 1fr;
              gap: 32px;
              padding: 28px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
              align-items: baseline;
            }
            .cs-contact-rows__label {
              margin: 0;
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-contact-rows__value {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 22px;
              line-height: 1.3;
              letter-spacing: -0.01em;
              color: var(--paper);
              text-wrap: pretty;
            }
            @media (max-width: 600px) {
              .cs-contact-rows { padding: 48px 0 72px; }
              .cs-contact-rows__row {
                grid-template-columns: 1fr;
                gap: 8px;
                padding: 22px 0;
              }
              .cs-contact-rows__value { font-size: 18px; }
            }
          `}</style>
        </section>

        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
