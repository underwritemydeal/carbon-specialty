import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { BottomCTA } from "@/components/BottomCTA";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  breadcrumbs,
  howToQuote,
  webApplication,
  faqPage,
} from "@/lib/schema";
import type { FAQItem } from "@/components/FAQ";

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

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Open chat",
    body: "Click the hero input or the Get-a-quote CTA. The Carbon chat panel slides in from the right.",
  },
  {
    title: "Describe your building",
    body: "Tell Carbon about the asset in your own words. Multifamily, mixed-use, SFR portfolio, HOA, builders risk.",
  },
  {
    title: "AI captures details",
    body: "The AI captures structured intake data — asset class, address, units, renewal date, owner contact — and confirms what's missing.",
  },
  {
    title: "Specialist reviews",
    body: "A licensed Carbon specialist reads the submission and requests any missing artifacts (rent rolls, loss runs, dec page).",
  },
  {
    title: "Specialist follow-up",
    body: "A licensed Carbon specialist follows up on every complete submission. The specialist tells you the indication and the timing once underwriting has read the schedule and ordered carrier quotes.",
  },
];

export const metadata: Metadata = {
  title: "How Carbon Specialty's AI quote intake works",
  description:
    "Carbon's conversational AI quote tool captures your real estate schedule, then routes it to a specialist for an indication. Five steps from open-chat to quote.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Carbon Specialty's AI quote intake works",
    images: [
      {
        url: "/api/og?title=How%20it%20works&sub=AI%20quote%20intake%20%C2%B7%20Specialist-reviewed",
        width: 1200,
        height: 630,
      },
    ],
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
        <PageHero
          eyebrow="How it works"
          headline="The AI quote intake."
          accent="Specialist-reviewed."
          lede="Carbon's conversational quote tool is the fastest way to put a real estate insurance submission in front of a specialist. The AI captures the schedule — asset class, address, units, year built, current carrier — and a licensed Carbon specialist comes back with an indication within one business day."
        />

        {/* Five named steps */}
        <section className="cs-hiw-steps" aria-labelledby="hiw-steps-headline">
          <div className="container">
            <div className="cs-hiw-steps__intro">
              <span className="cs-hiw-steps__eyebrow">02 — Five named steps</span>
              <h2 id="hiw-steps-headline" className="cs-hiw-steps__headline">
                From open-chat to quote.
              </h2>
            </div>

            <ol className="cs-hiw-steps__list">
              {STEPS.map(({ title, body }, i) => (
                <li key={title} className="cs-hiw-steps__item">
                  <span className="cs-hiw-steps__num">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="cs-hiw-steps__title">{title}</h3>
                  <p className="cs-hiw-steps__body">{body}</p>
                </li>
              ))}
            </ol>
          </div>

          <style>{`
            .cs-hiw-steps {
              background: var(--ink);
              color: var(--paper);
              padding: 80px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-hiw-steps__intro {
              display: flex;
              flex-direction: column;
              gap: 14px;
              margin-bottom: 56px;
            }
            .cs-hiw-steps__eyebrow {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-hiw-steps__headline {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 40px;
              line-height: 1.1;
              color: var(--paper);
              text-wrap: balance;
            }
            .cs-hiw-steps__list {
              list-style: none;
              margin: 0;
              padding: 0;
              border-top: 1px solid rgba(244,241,234,0.10);
            }
            .cs-hiw-steps__item {
              display: grid;
              grid-template-columns: 80px 1fr 2fr;
              gap: 32px;
              padding: 28px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-hiw-steps__num {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.16em;
              color: var(--ember);
              padding-top: 6px;
            }
            .cs-hiw-steps__title {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 26px;
              line-height: 1.15;
              letter-spacing: -0.02em;
              color: var(--paper);
            }
            .cs-hiw-steps__body {
              margin: 0;
              font-family: var(--font-body);
              font-size: 16px;
              line-height: 1.6;
              color: rgba(244,241,234,0.70);
              max-width: 60ch;
              text-wrap: pretty;
            }

            @media (max-width: 768px) {
              .cs-hiw-steps__item {
                grid-template-columns: 1fr;
                gap: 8px;
              }
              .cs-hiw-steps__num { padding-top: 0; }
              .cs-hiw-steps__headline { font-size: 32px; }
            }
            @media (max-width: 480px) {
              .cs-hiw-steps { padding: 56px 0; }
            }
          `}</style>
        </section>

        {/* FAQ */}
        <section className="cs-hiw-faq" aria-labelledby="hiw-faq-headline">
          <div className="container">
            <div className="cs-hiw-faq__intro">
              <span className="cs-hiw-faq__eyebrow">03 — FAQ</span>
              <h2 id="hiw-faq-headline" className="cs-hiw-faq__headline">
                What people ask about the AI quote tool.
              </h2>
            </div>

            <dl className="cs-hiw-faq__list">
              {HIW_FAQ.map(({ q, a }) => (
                <div key={q} className="cs-hiw-faq__row">
                  <dt className="cs-hiw-faq__q">{q}</dt>
                  <dd className="cs-hiw-faq__a">{a}</dd>
                </div>
              ))}
            </dl>
          </div>

          <style>{`
            .cs-hiw-faq {
              background: #0D1214;
              color: var(--paper);
              padding: 80px 0;
            }
            .cs-hiw-faq__intro {
              display: flex;
              flex-direction: column;
              gap: 14px;
              margin-bottom: 48px;
            }
            .cs-hiw-faq__eyebrow {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-hiw-faq__headline {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 36px;
              line-height: 1.1;
              color: var(--paper);
              text-wrap: balance;
            }
            .cs-hiw-faq__list {
              margin: 0;
              padding: 0;
              border-top: 1px solid rgba(244,241,234,0.10);
            }
            .cs-hiw-faq__row {
              display: grid;
              grid-template-columns: 1fr 2fr;
              gap: 48px;
              padding: 32px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-hiw-faq__q {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 22px;
              line-height: 1.25;
              color: var(--paper);
              text-wrap: balance;
            }
            .cs-hiw-faq__a {
              margin: 0;
              font-family: var(--font-body);
              font-size: 16px;
              line-height: 1.6;
              color: rgba(244,241,234,0.70);
              text-wrap: pretty;
            }
            @media (max-width: 768px) {
              .cs-hiw-faq__row { grid-template-columns: 1fr; gap: 12px; }
              .cs-hiw-faq__headline { font-size: 28px; }
            }
            @media (max-width: 480px) {
              .cs-hiw-faq { padding: 56px 0; }
            }
          `}</style>
        </section>

        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
