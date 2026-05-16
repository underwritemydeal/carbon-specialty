"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useChat } from "./ChatProvider";
import { track } from "@/lib/analytics";

const PLACEHOLDERS = [
  "24 units in Long Beach, 1962…",
  "Mixed-use in Oakland, need EQ…",
  "Builders risk, ground-up multifamily.",
  "SFR portfolio · 80 doors · Phoenix.",
  "Renewal on a 6-building schedule, May.",
  "10-unit walk-up, recent fire. Help.",
];

const SUGGESTIONS = ["Speak to someone", "Open the form", "Tell Carbon about my building"];

const HEADLINES = [
  { lead: "Real estate insurance for the buildings", accent: "California", trail: "can’t afford to lose." },
  { lead: "Real estate insurance for the buildings", accent: "the West", trail: "can’t afford to lose." },
];

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function Hero() {
  const router = useRouter();
  const { open: onOpenChat } = useChat();
  const [input, setInput] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (focused || input) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(id);
  }, [focused, input]);

  useEffect(() => {
    const id = setInterval(() => setHeadlineIdx((i) => (i + 1) % HEADLINES.length), 8000);
    return () => clearInterval(id);
  }, []);

  const submit = (msg?: string) => {
    const text = (msg ?? input).trim();
    track("cs_hero_input_submit", { has_text: Boolean(text), suggestion: msg ?? null });
    if (text === "Open the form") {
      router.push("/quote");
      return;
    }
    onOpenChat(text || undefined);
    setInput("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const current = HEADLINES[headlineIdx];

  return (
    <section
      aria-labelledby="hero-headline"
      style={{
        position: "relative",
        background: "var(--ink)",
        color: "var(--paper)",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {/* Atmospheric ground — subtle, restrained */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 90% 10%, rgba(31,77,56,0.16) 0%, transparent 55%)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(245,242,236,0.10) 1px, transparent 0)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 75% 75% at 50% 60%, black 30%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 75% at 50% 60%, black 30%, transparent 90%)",
        }}
      />

      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100vh",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          paddingBlock: "24px 24px",
        }}
      >
        {/* === HEADER === wordmark + nav + secondary CTA */}
        <header
          className="hero-header"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 32,
            paddingBlock: 8,
          }}
        >
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }} aria-label="Carbon Specialty — home">
            <span
              style={{
                fontFamily: "var(--font-wordmark)",
                fontSize: 24,
                letterSpacing: "0.28em",
                paddingLeft: "0.28em",
                textTransform: "uppercase",
                fontVariationSettings: '"opsz" 96',
                color: "var(--paper)",
                display: "inline-block",
                lineHeight: 1,
              }}
            >
              <span style={{ color: "var(--ember)" }}>CA</span>RBON
            </span>
            <span
              style={{
                display: "block",
                marginTop: 6,
                fontFamily: "var(--font-wordmark)",
                fontSize: 9,
                letterSpacing: "0.4em",
                paddingLeft: "0.4em",
                textTransform: "uppercase",
                color: "var(--paper-2)",
              }}
            >
              Specialty &middot; Insurance
            </span>
          </Link>

          <nav
            aria-label="Primary"
            className="hero-nav"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 32,
            }}
          >
            {[
              { label: "What we write", href: "/what-we-write" },
              { label: "How it works", href: "/how-it-works" },
              { label: "About", href: "/about" },
              { label: "Insights", href: "/insights" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "var(--paper)",
                  textDecoration: "none",
                  borderBottom: "1px solid transparent",
                  paddingBottom: 2,
                  transition: "border-color var(--dur-fast) var(--ease)",
                }}
                className="hero-nav-link"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/quote"
            className="hero-quote-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              letterSpacing: 0,
              color: "var(--ink)",
              background: "var(--paper)",
              border: "1px solid var(--paper)",
              textDecoration: "none",
              transition: "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
            }}
          >
            Get a quote
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          </Link>
        </header>

        {/* Hairline rule under header */}
        <div
          aria-hidden
          style={{ height: 1, background: "var(--paper-3)", marginTop: 24 }}
        />

        {/* === BODY === headline + lede + chat input, comfortably above fold */}
        <div className="grid-12 hero-body" style={{ alignContent: "center", rowGap: 36, paddingBlock: "40px 32px" }}>
          {/* Eyebrow line — section index left, status right */}
          <div className="col-12" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ember)",
              }}
            >
              00 — Get a quote
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--paper-3)",
              }}
            >
              <PulseDot /> Carbon · online · responding in seconds
            </span>
          </div>

          {/* Headline */}
          <motion.h1
            id="hero-headline"
            className="col-9 start-1 hero-h1"
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(40px, 5.4vw, 72px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              color: "var(--paper)",
              textWrap: "balance",
            }}
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
            }}
            key={headlineIdx}
          >
            {current.lead.split(" ").map((w, i) => (
              <Word key={i} reduce={reduce}>
                {w}
              </Word>
            ))}{" "}
            <Accent reduce={reduce} stagger={current.lead.split(" ").length}>
              {current.accent}
            </Accent>{" "}
            {current.trail.split(" ").map((w, i) => (
              <Word key={`t-${i}`} reduce={reduce} delay={0.35}>
                {w}
              </Word>
            ))}
          </motion.h1>

          {/* Lede + chat as a paired sub-grid */}
          <div className="col-12 grid-12 hero-sub" style={{ rowGap: 24 }}>
            <motion.p
              className="col-5 start-1 hero-lede"
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.7 }}
              style={{
                margin: 0,
                fontFamily: "var(--font-body)",
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--paper-2)",
                textWrap: "pretty",
              }}
            >
              An independent brokerage for multifamily, mixed-use, SFR portfolios, HOAs, and
              apartment buildings. California-led, Western United States–licensed.
            </motion.p>

            <motion.div
              className="col-6 start-7 hero-cta"
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.85 }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div
                style={{
                  border: focused ? "1px solid var(--ember)" : "1px solid var(--paper-3)",
                  transition: "border-color var(--dur-fast) var(--ease)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "stretch",
                  background: "rgba(245,242,236,0.04)",
                }}
              >
                <label htmlFor="hero-input" className="sr-only">
                  Tell Carbon about your building
                </label>
                <textarea
                  id="hero-input"
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  onFocus={() => {
                    setFocused(true);
                    track("cs_hero_input_focus");
                  }}
                  onBlur={() => setFocused(false)}
                  placeholder={PLACEHOLDERS[placeholderIdx]}
                  style={{
                    resize: "none",
                    border: 0,
                    outline: "none",
                    background: "transparent",
                    padding: "18px 20px",
                    fontFamily: "var(--font-body)",
                    fontSize: 17,
                    lineHeight: 1.4,
                    color: "var(--paper)",
                    minHeight: 56,
                    maxHeight: 160,
                  }}
                />
                <button
                  type="button"
                  onClick={() => submit()}
                  aria-label="Ask Carbon"
                  className="hero-ask"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 20px",
                    border: 0,
                    borderLeft: "1px solid var(--paper-3)",
                    background: input.trim() ? "var(--ember)" : "transparent",
                    color: input.trim() ? "var(--paper)" : "var(--paper)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
                  }}
                >
                  <span>Ask Carbon</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <polyline points="14 6 20 12 14 18" />
                  </svg>
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--paper-3)",
                  }}
                >
                  Try
                </span>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="hero-try"
                    style={{
                      appearance: "none",
                      background: "transparent",
                      border: 0,
                      padding: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--paper-2)",
                      cursor: "pointer",
                      borderBottom: "1px solid transparent",
                      transition: "border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
                    }}
                  >
                    {s}
                  </button>
                ))}
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--paper-3)",
                    }}
                  >
                    or
                  </span>
                  <Link
                    href="/quote"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--paper)",
                      textDecoration: "none",
                      borderBottom: "1px solid var(--paper)",
                      paddingBottom: 2,
                    }}
                  >
                    Use the form →
                  </Link>
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer rule — mono pagination */}
        <div
          style={{
            paddingTop: 20,
            borderTop: "1px solid var(--paper-3)",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "baseline",
            gap: 24,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--paper-3)",
            }}
          >
            Cover
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--paper-3)",
              textAlign: "center",
            }}
            className="hero-tagline"
          >
            Carbon Specialty Insurance · Real estate &middot; California &amp; the Western United States
          </span>
          <span className="page-no inverted">01 / 06</span>
        </div>
      </div>

      <style>{`
        .hero-nav-link:hover { border-bottom-color: var(--ember) !important; }
        .hero-try:hover { border-bottom-color: var(--ember) !important; color: var(--paper) !important; }
        .hero-quote-btn:hover { background: transparent !important; color: var(--paper) !important; }
        @media (max-width: 960px) {
          .hero-nav { display: none !important; }
        }
        @media (max-width: 768px) {
          .hero-sub .col-5,
          .hero-sub .col-6 { grid-column: 1 / -1 !important; }
          .hero-tagline { display: none; }
        }
      `}</style>
    </section>
  );
}

function Word({
  children,
  reduce,
  delay = 0,
}: {
  children: React.ReactNode;
  reduce: boolean | null;
  delay?: number;
}) {
  return (
    <motion.span
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay } },
      }}
      style={{ display: "inline-block", whiteSpace: "pre", marginRight: "0.22em" }}
    >
      {children}
    </motion.span>
  );
}

function Accent({
  children,
  reduce,
  stagger = 0,
}: {
  children: React.ReactNode;
  reduce: boolean | null;
  stagger?: number;
}) {
  return (
    <motion.em
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.75, ease: EASE, delay: stagger * 0.05 + 0.15 },
        },
      }}
      style={{
        display: "inline-block",
        fontStyle: "italic",
        color: "var(--ember)",
        paddingRight: "0.06em",
        marginRight: "0.06em",
      }}
    >
      {children}
    </motion.em>
  );
}

function PulseDot() {
  return (
    <span aria-hidden style={{ position: "relative", display: "inline-flex", width: 7, height: 7 }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ember)",
          animation: "carbon-pulse 1.8s ease-out infinite",
        }}
      />
      <span style={{ position: "relative", width: 7, height: 7, background: "var(--ember)" }} />
      <style>{`
        @keyframes carbon-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          80%, 100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
