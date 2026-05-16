import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Section } from "@/components/Section";
import { Process } from "@/components/Process";
import { FAQ, type FAQItem } from "@/components/FAQ";
import { CTAStrip } from "@/components/CTAStrip";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  breadcrumbs,
  howToQuote,
  webApplication,
  faqPage,
} from "@/lib/schema";

// DRAFT — review before publishing
const HIW_FAQ: FAQItem[] = [
  {
    q: "How long does the AI quote intake take?",
    a: "Most chats take about as long as it takes to describe the building — a few minutes of back-and-forth. The clock toward an indication starts after a Carbon specialist has reviewed the submission and confirmed nothing is missing.",
  },
  {
    q: "What information do you need?",
    a: "Asset class, property address (at minimum city and zip), unit count, year built, a rough replacement-cost estimate, current carrier and renewal date, and owner-entity contact details. The AI captures this in a structured payload; missing fields get requested by the specialist.",
  },
  {
    q: "Is the AI making decisions about my coverage?",
    a: "No. The conversational AI tool is intake only. It captures and structures the information, then routes it to a licensed Carbon specialist for underwriting, carrier selection, and the quote itself.",
  },
  {
    q: "Who reviews my submission?",
    a: "A Carbon specialist — Robby Hess or one of the team — reviews every submission within one business day. We're a licensed independent brokerage; the AI does not bind or quote on its own.",
  },
  {
    q: "When will I get a quote?",
    a: "Turnaround depends on the schedule, the carrier, and what underwriting asks for. The specialist tells you up front when to expect an indication — straightforward submissions move fast; complex schedules, builders risk, or anything needing loss runs and rent rolls take longer.",
  },
];

export const metadata: Metadata = {
  title: "How Carbon Specialty's AI quote intake works",
  description:
    "Carbon's conversational AI quote tool captures your real estate schedule, then routes it to a specialist for an indication. Five steps from open-chat to quote.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Carbon Specialty's AI quote intake works",
    images: [{ url: "/api/og?title=How%20it%20works&sub=AI%20quote%20intake%20%C2%B7%20Specialist-reviewed", width: 1200, height: 630 }],
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          howToQuote(),
          webApplication(),
          faqPage(HIW_FAQ),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "How it works", href: "/how-it-works" },
          ]),
        ]}
      />
      <Header activePath="/how-it-works" />
      <main id="main">
        <Section
          number={1}
          eyebrow="How it works"
          headline={
            <>
              The AI quote intake. <em style={{ fontStyle: "italic" }}>Specialist-reviewed.</em>
            </>
          }
          lede="Carbon Specialty's conversational quote tool is the fastest way to put a real estate insurance submission in front of a specialist. The AI captures the schedule — asset class, address, units, year built, current carrier — and a licensed Carbon specialist comes back with an indication within one business day."
        >
          <Process />
        </Section>

        <Section
          number={2}
          eyebrow="02 — Five named steps"
          headline="From open-chat to quote."
          lede="The HowTo schema on this page enumerates the same five steps an AI search engine will read."
        >
          <ol
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 0,
              borderTop: "1px solid var(--ink)",
            }}
          >
            {[
              ["Open chat", "Click the hero input or the Get-a-quote CTA. The Carbon chat panel slides in from the right."],
              ["Describe your building", "Tell Carbon about the asset in your own words. Multifamily, mixed-use, SFR portfolio, HOA, builders risk."],
              ["AI captures details", "The AI captures structured intake data — asset class, address, units, renewal date, owner contact — and confirms what's missing."],
              ["Specialist reviews", "A licensed Carbon specialist reads the submission and requests any missing artifacts (rent rolls, loss runs, dec page)."],
              ["Specialist follow-up", "A licensed Carbon specialist follows up on every complete submission. The specialist tells you the indication and the timing once underwriting has read the schedule and ordered carrier quotes."],
            ].map(([title, body], i) => (
              <li
                key={title}
                style={{
                  borderBottom: "1px solid var(--ink)",
                  padding: "32px 0",
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 2fr",
                  gap: 32,
                }}
                className="hiw-step"
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    color: "var(--ember)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-body)",
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: "var(--ink-2)",
                  }}
                >
                  {body}
                </p>
              </li>
            ))}
            <style>{`
              @media (max-width: 768px) {
                .hiw-step { grid-template-columns: 1fr !important; gap: 8px !important; }
              }
            `}</style>
          </ol>
        </Section>

        <Section
          number={3}
          eyebrow="03 — FAQ"
          headline="What people ask about the AI quote tool."
          lede="Draft answers under broker review."
        >
          <FAQ items={HIW_FAQ} eyebrow="03 — FAQ" />
        </Section>

        <CTAStrip />
      </main>
      <Footer />
    </>
  );
}
