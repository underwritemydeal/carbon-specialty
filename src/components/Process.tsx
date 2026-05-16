"use client";

import { ParallaxNumeral } from "./ParallaxNumeral";
import { motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";

const EASE = [0.2, 0.7, 0.2, 1] as const;

// All steps paper-base. Rhythm via alignment: 01 left, 02 right, 03 centered.
// Layout — not color inversion — creates the editorial rhythm.
const STEPS = [
  {
    n: "01",
    title: "Intake",
    body:
      "Tell Carbon about the building — asset class, address, units, year built, current carrier. Two minutes in chat or three short form steps. The AI captures the structured payload; nothing about you is sent into a sales funnel.",
    aside: "Schedule · Address · Year built · Current carrier",
    align: "left" as const,
  },
  {
    n: "02",
    title: "Underwriting",
    body:
      "A specialist reads the schedule line by line, requests anything missing (rent rolls, loss runs, the current dec page), and orders quotes from the short list of carriers active on your asset class. No fishing across markets that won’t bind.",
    aside: "Loss runs · Dec page · Rent rolls · Short-list carriers",
    align: "right" as const,
  },
  {
    n: "03",
    title: "Bind & service",
    body:
      "Options compared line by line, recommendation explained without insurance jargon, coverage bound, and endorsements, COIs, and renewals handled from there. The submission goes into Carbon’s file; the file follows the building, not the broker.",
    aside: "Bind · COI · Endorsement · Renewal · Service",
    align: "center" as const,
  },
];

export function Process() {
  return (
    <section
      id="process"
      aria-labelledby="process-headline"
      style={{ borderBottom: "1px solid var(--ink)", background: "var(--paper)" }}
    >
      {/* Section opening */}
      <div
        style={{
          background: "var(--paper)",
          paddingBlock: "96px 56px",
          borderBottom: "1px solid var(--ink)",
        }}
      >
        <div className="container">
          <div className="grid-12">
            <div className="col-7">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                }}
              >
                05 — Process
              </span>
              <h2
                id="process-headline"
                style={{
                  margin: "16px 0 0",
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(36px, 5vw, 64px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                  textWrap: "balance",
                }}
              >
                Intake. Underwriting.{" "}
                <em style={{ fontStyle: "italic", color: "var(--ember)" }}>Bind.</em>
              </h2>
            </div>
            <div className="col-5 start-8 process-marg">
              <span className="marginalia">
                Three stages, told at the scale they actually take.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Three step panels — each fills the viewport and reads as its own page */}
      {STEPS.map((s, i) => (
        <StepPanel key={s.n} step={s} index={i} />
      ))}
    </section>
  );
}

function StepPanel({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const reduce = useReducedMotion();
  const reveal: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  };

  // Layout rhythm — left / right / centered. Asymmetry not inversion.
  const layout = step.align === "left"
    ? { numCol: "col-3 start-1", textCol: "col-7 start-4", textAlign: "left" as const }
    : step.align === "right"
    ? { numCol: "col-3 start-10", textCol: "col-7 start-2", textAlign: "left" as const }
    : { numCol: "col-3 start-5", textCol: "col-8 start-3", textAlign: "center" as const };

  return (
    <div
      style={{
        background: "var(--paper)",
        color: "var(--ink)",
        borderBottom: "1px solid var(--ink)",
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        paddingBlock: "64px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Step header — paginated rule */}
      <div className="container">
        <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--ink)", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--ember)",
            }}
          >
            Stage · {step.n} of 03
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            05.{step.n} / 06
          </span>
        </div>
      </div>

      <div className="container" style={{ flex: 1, display: "flex", alignItems: "center", paddingBlock: "64px 32px" }}>
        <motion.div
          className="grid-12 step-row"
          style={{ alignItems: "flex-start", width: "100%", rowGap: 32 }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={reveal}
        >
          {/* Numeral — placement varies by step.align */}
          <div className={`${layout.numCol} step-numeral`} style={{ display: "flex", alignItems: "flex-start", justifyContent: step.align === "right" ? "flex-end" : step.align === "center" ? "center" : "flex-start" }}>
            <ParallaxNumeral intensity={6}>
              <span
                aria-hidden
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(96px, 12vw, 168px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.04em",
                  color: "var(--ember)",
                  fontFeatureSettings: '"tnum" 1',
                  display: "block",
                }}
              >
                {step.n}
              </span>
            </ParallaxNumeral>
          </div>

          {/* Body — serif title + drop-cap paragraph + mono aside */}
          <div
            className={`${layout.textCol} step-text`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              justifyContent: "center",
              textAlign: layout.textAlign,
              alignItems: layout.textAlign === "center" ? "center" : "flex-start",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(32px, 4vw, 52px)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
                textWrap: "balance",
              }}
            >
              {step.title}
            </h3>
            <p
              className={layout.textAlign === "left" ? "drop-cap" : undefined}
              style={{
                margin: 0,
                maxWidth: 560,
                fontFamily: "var(--font-body)",
                fontSize: 17,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                textWrap: "pretty",
              }}
            >
              {step.body}
            </p>
            <div
              style={{
                marginTop: 8,
                paddingTop: 12,
                borderTop: "1px solid var(--ink-3)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                maxWidth: 560,
                width: "100%",
              }}
            >
              {step.aside}
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .step-row .step-numeral,
          .step-row .step-text {
            grid-column: 1 / -1 !important;
            justify-content: flex-start !important;
            align-items: flex-start !important;
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
}
