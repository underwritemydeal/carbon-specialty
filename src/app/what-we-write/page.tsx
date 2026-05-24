import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { BottomCTA } from "@/components/BottomCTA";
import { ASSET_CLASSES } from "@/lib/asset-classes";
import { JsonLd } from "@/components/JsonLd";
import {
  insuranceAgency,
  breadcrumbs,
  assetClassesItemList,
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "Coverage — asset classes Carbon insures",
  description:
    "Carbon Specialty writes real estate insurance across six asset classes for investment property owners: multifamily, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, and builders risk. Nationwide.",
  alternates: { canonical: "/what-we-write" },
};

const NOT_WRITTEN: string[] = [
  "Personal auto and home",
  "Life and health",
  "Generic small commercial outside real estate",
  "Contractors / construction trades (we'll refer)",
  "Workers comp without an underlying real estate policy",
  "Anything that isn't a building or the entity that owns one",
];

export default function WhatWeWritePage() {
  return (
    <>
      <JsonLd
        data={[
          insuranceAgency(),
          assetClassesItemList(),
          breadcrumbs([
            { name: "Home", href: "/" },
            { name: "Coverage", href: "/what-we-write" },
          ]),
        ]}
      />
      <Header activePath="/what-we-write" />
      <main id="main">
        <PageHero
          eyebrow="Coverage"
          headline="Buildings, owners,"
          accent="and the policies they need."
          lede="Carbon writes real estate insurance for multifamily and apartment buildings, mixed-use, SFR portfolios, condo HOAs, small commercial real estate, and builders risk — for investment property owners nationwide."
        />

        {/* Detail by asset class — six rows */}
        <section className="cs-ac-list" aria-labelledby="ac-list-headline">
          <div className="container">
            <div className="cs-ac-list__intro">
              <span className="cs-ac-list__eyebrow">02 — Detail by asset class</span>
              <h2 id="ac-list-headline" className="cs-ac-list__headline">
                The schedule decides the carrier.
              </h2>
              <p className="cs-ac-list__lede">
                Each asset class has a different short-list of carriers,
                different exclusions to read, and a different submission to
                assemble.
              </p>
            </div>

            <ol className="cs-ac-list__rows">
              {ASSET_CLASSES.map((a) => (
                <li key={a.slug} id={a.slug} className="cs-ac-list__row">
                  <span className="cs-ac-list__num">{a.n}</span>
                  <h3 className="cs-ac-list__title">{a.name}</h3>
                  <p className="cs-ac-list__body">{a.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <style>{`
            .cs-ac-list {
              background: var(--ink);
              color: var(--paper);
              padding: 80px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-ac-list__intro {
              display: flex;
              flex-direction: column;
              gap: 14px;
              margin-bottom: 56px;
              max-width: 720px;
            }
            .cs-ac-list__eyebrow {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-ac-list__headline {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 40px;
              line-height: 1.1;
              color: var(--paper);
              text-wrap: balance;
            }
            .cs-ac-list__lede {
              margin: 0;
              font-family: var(--font-body);
              font-size: 17px;
              line-height: 1.6;
              color: rgba(244,241,234,0.70);
              text-wrap: pretty;
            }
            .cs-ac-list__rows {
              list-style: none;
              margin: 0;
              padding: 0;
              border-top: 1px solid rgba(244,241,234,0.10);
            }
            .cs-ac-list__row {
              display: grid;
              grid-template-columns: 80px 1fr 2fr;
              gap: 32px;
              padding: 28px 0;
              border-bottom: 1px solid rgba(244,241,234,0.10);
            }
            .cs-ac-list__num {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.16em;
              color: var(--ember);
              padding-top: 6px;
            }
            .cs-ac-list__title {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 28px;
              line-height: 1.1;
              letter-spacing: -0.02em;
              color: var(--paper);
            }
            .cs-ac-list__body {
              margin: 0;
              font-family: var(--font-body);
              font-size: 16px;
              line-height: 1.6;
              color: rgba(244,241,234,0.70);
              max-width: 60ch;
              text-wrap: pretty;
            }

            @media (max-width: 768px) {
              .cs-ac-list__row { grid-template-columns: 1fr; gap: 8px; }
              .cs-ac-list__num { padding-top: 0; }
              .cs-ac-list__headline { font-size: 32px; }
            }
            @media (max-width: 480px) {
              .cs-ac-list { padding: 56px 0; }
            }
          `}</style>
        </section>

        {/* Out of scope */}
        <section className="cs-ac-not" aria-labelledby="ac-not-headline">
          <div className="container">
            <div className="cs-ac-not__intro">
              <span className="cs-ac-not__eyebrow">03 — Out of scope</span>
              <h2 id="ac-not-headline" className="cs-ac-not__headline">
                What Carbon doesn&apos;t write.
              </h2>
              <p className="cs-ac-not__lede">
                Depth, not breadth. If your need falls outside real estate,
                we&apos;ll refer you to someone we trust.
              </p>
            </div>
            <ul className="cs-ac-not__list">
              {NOT_WRITTEN.map((line) => (
                <li key={line} className="cs-ac-not__item">{line}</li>
              ))}
            </ul>
          </div>

          <style>{`
            .cs-ac-not {
              background: #0D1214;
              color: var(--paper);
              padding: 80px 0;
            }
            .cs-ac-not__intro {
              display: flex;
              flex-direction: column;
              gap: 14px;
              margin-bottom: 40px;
              max-width: 720px;
            }
            .cs-ac-not__eyebrow {
              font-family: var(--font-mono);
              font-size: 11px;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: var(--ember);
            }
            .cs-ac-not__headline {
              margin: 0;
              font-family: var(--font-display);
              font-weight: 400;
              font-size: 36px;
              line-height: 1.1;
              color: var(--paper);
              text-wrap: balance;
            }
            .cs-ac-not__lede {
              margin: 0;
              font-family: var(--font-body);
              font-size: 16px;
              line-height: 1.6;
              color: rgba(244,241,234,0.70);
              text-wrap: pretty;
            }
            .cs-ac-not__list {
              list-style: none;
              margin: 0;
              padding: 0;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 48px;
              border-top: 1px solid rgba(244,241,234,0.10);
              padding-top: 24px;
            }
            .cs-ac-not__item {
              font-family: var(--font-body);
              font-size: 15px;
              line-height: 1.7;
              color: rgba(244,241,234,0.75);
            }
            @media (max-width: 768px) {
              .cs-ac-not__list { grid-template-columns: 1fr; gap: 4px; }
              .cs-ac-not__headline { font-size: 28px; }
            }
            @media (max-width: 480px) {
              .cs-ac-not { padding: 56px 0; }
            }
          `}</style>
        </section>

        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
