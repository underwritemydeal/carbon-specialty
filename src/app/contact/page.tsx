import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  localBusiness,
  breadcrumbs,
} from "@/lib/schema";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — Phone, email, hours",
  description: `Reach Carbon Specialty. Phone ${SITE.phoneDisplay}, email ${SITE.email}, Mon–Fri 8a–6p Pacific. Based in Long Beach, California.`,
  alternates: { canonical: "/contact" },
};

const ROWS: [string, React.ReactNode][] = [
  ["Phone", <a key="p" href="tel:+15625550144" className="link">{SITE.phoneDisplay}</a>],
  ["Email", <a key="e" href={`mailto:${SITE.email}`} className="link">{SITE.email}</a>],
  ["Hours", "Mon – Fri · 8a – 6p Pacific"],
  ["Office", "Long Beach, California"],
  ["Licensed", "AZ · CA · CO · ID · NV · OR · TX · UT · WA"],
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
        <Section
          number={1}
          eyebrow="Contact"
          headline={
            <>
              Reach Carbon. <em style={{ fontStyle: "italic" }}>Directly.</em>
            </>
          }
          lede="No tickets, no chatbot tree (other than the one on the homepage, which is voluntary). Phone, email, business hours."
        >
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              gap: "24px 32px",
              margin: 0,
              borderTop: "1px solid var(--ink)",
              paddingTop: 32,
            }}
            className="contact-rows"
          >
            {ROWS.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ink-3)",
                    paddingTop: 4,
                  }}
                >
                  {k}
                </dt>
                <dd
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {v}
                </dd>
              </div>
            ))}
            <style>{`
              @media (max-width: 600px) {
                .contact-rows { grid-template-columns: 1fr !important; gap: 4px 0 !important; }
                .contact-rows dd { padding-bottom: 16px; }
              }
            `}</style>
          </dl>
        </Section>
      </main>
      <Footer />
    </>
  );
}
