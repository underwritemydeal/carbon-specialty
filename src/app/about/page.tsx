import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { BottomCTA } from "@/components/BottomCTA";
import { AUTHORS, type Author } from "@/components/AuthorBio";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  breadcrumbs,
  personSchema,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "About — real estate insurance specialists for investment property owners",
  description:
    "Carbon Specialty specializes in real estate insurance for investment property owners, nationwide. Founded by Robby Hess (20+ years commercial insurance) and Anthony Miller (30 years industry).",
  alternates: { canonical: "/about" },
};

const PILLARS: Array<{ label: string; body: string }> = [
  {
    label: "Specialty",
    body: "Real estate insurance — multifamily, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, and builders risk. No personal lines. No life. No generic small commercial.",
  },
  {
    label: "Geography",
    body: "Nationwide. Carbon places business in every region of the country — direct admitted appointments where they make sense and wholesale or program partners where the right market lives elsewhere. Our job is to know which one belongs on your schedule before the submission goes out.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          personSchema("robby-hess"),
          personSchema("anthony-miller"),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "About", href: "/about" },
          ]),
        ]}
      />
      <Header activePath="/about" />
      <main id="main">
        <PageHero
          eyebrow="About"
          headline="Real estate insurance for"
          accent="investment property owners."
          lede="Carbon Specialty is an independent insurance brokerage specializing in real estate insurance for investment property owners — nationwide. Depth over breadth: one specialty, the right carrier or program for every region of the country, one short list of submissions per asset class."
        />

        {/* Specialty / Geography */}
        <section className="cs-about-pillars" aria-labelledby="about-pillars-headline">
          <div className="container">
            <h2 id="about-pillars-headline" className="sr-only">
              How Carbon works
            </h2>
            <div className="cs-about-pillars__grid">
              {PILLARS.map(({ label, body }) => (
                <div key={label} className="cs-about-pillars__cell">
                  <span className="cs-about-pillars__label">{label}</span>
                  <p className="cs-about-pillars__body">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <style>{`
            .cs-about-pillars {
              background: var(--ink);
              color: var(--paper);
              padding: 80px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-about-pillars__grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 48px;
              border-top: 1px solid rgba(244,241,234,0.10);
              padding-top: 40px;
            }
            .cs-about-pillars__cell {
              display: flex;
              flex-direction: column;
              gap: 14px;
            }
            .cs-about-pillars__label {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-about-pillars__body {
              margin: 0;
              font-family: var(--font-body);
              font-size: 16px;
              line-height: 1.6;
              color: rgba(244,241,234,0.75);
              max-width: 60ch;
              text-wrap: pretty;
            }
            @media (max-width: 768px) {
              .cs-about-pillars { padding: 56px 0; }
              .cs-about-pillars__grid { grid-template-columns: 1fr; gap: 32px; }
            }
          `}</style>
        </section>

        {/* Founders */}
        <section className="cs-about-founders" aria-labelledby="about-founders-headline">
          <div className="container">
            <div className="cs-about-founders__intro">
              <span className="cs-about-founders__eyebrow">02 — Founders</span>
              <h2 id="about-founders-headline" className="cs-about-founders__headline">
                Who&apos;s writing your policy.
              </h2>
              <p className="cs-about-founders__lede">
                Two co-founders. Combined 50+ years in commercial insurance, all of it on the real estate side.
              </p>
            </div>

            <div className="cs-about-founders__list">
              {Object.values(AUTHORS).map((author) => (
                <FounderCard key={author.slug} author={author} />
              ))}
            </div>
          </div>

          <style>{`
            .cs-about-founders {
              background: #0D1214;
              color: var(--paper);
              padding: 80px 0;
            }
            .cs-about-founders__intro {
              display: flex;
              flex-direction: column;
              gap: 14px;
              margin-bottom: 48px;
              max-width: 720px;
            }
            .cs-about-founders__eyebrow {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-about-founders__headline {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 36px;
              line-height: 1.1;
              color: var(--paper);
              text-wrap: balance;
            }
            .cs-about-founders__lede {
              margin: 0;
              font-family: var(--font-body);
              font-size: 17px;
              line-height: 1.6;
              color: rgba(244,241,234,0.70);
              text-wrap: pretty;
            }
            .cs-about-founders__list {
              display: flex;
              flex-direction: column;
              gap: 0;
              border-top: 1px solid rgba(244,241,234,0.10);
            }
            @media (max-width: 480px) {
              .cs-about-founders { padding: 56px 0; }
              .cs-about-founders__headline { font-size: 28px; }
            }
          `}</style>
        </section>

        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}

function FounderCard({ author }: { author: Author }) {
  return (
    <article
      itemScope
      itemType="https://schema.org/Person"
      className="cs-founder"
    >
      <div className="cs-founder__meta">
        <span className="cs-founder__years">{author.yearsExperience}+ years</span>
        <span className="cs-founder__co">Co-founder</span>
      </div>
      <div className="cs-founder__body">
        <h3 itemProp="name" className="cs-founder__name">{author.name}</h3>
        <span itemProp="jobTitle" className="cs-founder__role">{author.role}</span>
        <p itemProp="description" className="cs-founder__bio">{author.bio}</p>
        <ul className="cs-founder__tags">
          {author.expertise.map((e) => (
            <li key={e} itemProp="knowsAbout" className="cs-founder__tag">{e}</li>
          ))}
        </ul>
      </div>

      <style>{`
        .cs-founder {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 40px;
          padding: 40px 0;
          border-bottom: 1px solid rgba(244,241,234,0.10);
        }
        .cs-founder__meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cs-founder__years {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ember);
        }
        .cs-founder__co {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.50);
        }
        .cs-founder__body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cs-founder__name {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 32px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--paper);
        }
        .cs-founder__role {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(244,241,234,0.50);
        }
        .cs-founder__bio {
          margin: 0;
          font-family: var(--font-body);
          font-size: 16px;
          line-height: 1.6;
          color: rgba(244,241,234,0.75);
          max-width: 64ch;
        }
        .cs-founder__tags {
          margin: 8px 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .cs-founder__tag {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 4px 10px;
          border: 1px solid rgba(244,241,234,0.20);
          color: rgba(244,241,234,0.75);
          border-radius: 4px;
        }
        @media (max-width: 768px) {
          .cs-founder { grid-template-columns: 1fr; gap: 16px; }
          .cs-founder__name { font-size: 26px; }
        }
      `}</style>
    </article>
  );
}
