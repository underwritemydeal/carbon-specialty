"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Wordmark } from "./Wordmark";
import { PhotoSlot } from "./PhotoSlot";
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
  { lead: "Insurance for the buildings", accent: "California", trail: "can’t afford to lose." },
  { lead: "Insurance for the buildings", accent: "the West", trail: "can’t afford to lose." },
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
        background: "var(--paper)",
        color: "var(--ink)",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <div
        className="container"
        style={{
          position: "relative",
          paddingBlock: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {/* === HEADER === wordmark left / nav center / Get a quote right */}
        <header
          className="hero-header"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 32,
          }}
        >
          <Link href="/" style={{ textDecoration: "none", color: "inherit" }} aria-label="Carbon Specialty — home">
            <Wordmark size="sm" align="left" />
          </Link>

          <nav aria-label="Primary" className="hero-nav" style={{ display: "flex", justifyContent: "center", gap: 32 }}>
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
                className="hero-nav-link"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "var(--ink)",
                  textDecoration: "none",
                  borderBottom: "1px solid transparent",
                  paddingBottom: 2,
                  transition: "border-color var(--dur-fast) var(--ease)",
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/quote"
            className="btn"
            style={{ padding: "10px 18px", fontSize: 13 }}
          >
            Get a quote
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          </Link>
        </header>

        {/* Hairline rule under header */}
        <div aria-hidden style={{ height: 1, background: "var(--ink)" }} />

        {/* === EYEBROW === section index + status */}
        <div className="grid-12" style={{ alignItems: "baseline" }}>
          <span
            className="col-6"
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
            className="col-6"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "flex-end",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            <PulseDot /> Carbon · online · responding in seconds
          </span>
        </div>

        {/* === HEADLINE === cols 1-9 */}
        <motion.h1
          id="hero-headline"
          className="hero-h1"
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(44px, 6vw, 88px)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
            maxWidth: "16ch",
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
            <Word key={i} reduce={reduce}>{w}</Word>
          ))}{" "}
          <Accent reduce={reduce} stagger={current.lead.split(" ").length}>{current.accent}</Accent>{" "}
          {current.trail.split(" ").map((w, i) => (
            <Word key={`t-${i}`} reduce={reduce} delay={0.35}>{w}</Word>
          ))}
        </motion.h1>

        {/* === PHOTO + LEDE === plate cols 1-8 + lede cols 9-12 */}
        <div className="grid-12 hero-plate" style={{ alignItems: "stretch", columnGap: 32, rowGap: 24, marginTop: 8 }}>
          <div className="col-8 start-1 hero-photo">
            {/* Hairline ink rule above the plate */}
            <div aria-hidden style={{ height: 1, background: "var(--ink)", marginBottom: 12 }} />
            <div style={{ position: "relative" }}>
              <PhotoSlot
                alt="Three-quarter view of a 1960s California mid-century three-story stucco apartment building in Long Beach, palm fronds in soft focus at the edge of frame."
                caption="California · Long Beach · TK"
                ratio="16 / 9"
                priority
              />
            </div>
            <span
              style={{
                display: "block",
                marginTop: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              Plate 01 — California · Long Beach · 2026
            </span>
          </div>

          <div
            className="col-4 start-9 hero-lede-col"
            style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 13 }}
          >
            <motion.p
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
              style={{
                margin: 0,
                fontFamily: "var(--font-body)",
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--ink-2)",
                textWrap: "pretty",
                hyphens: "manual",
              }}
            >
              An independent insurance brokerage for multifamily, mixed-use, SFR portfolios, HOAs,
              and apartment buildings. California-led; licensed across the Western United States.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.7 }}
              style={{
                margin: 0,
                fontFamily: "var(--font-body)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--ink-3)",
                textWrap: "pretty",
                hyphens: "manual",
              }}
            >
              Describe your building below and Carbon — the AI quote agent — captures the
              submission for a specialist.
            </motion.p>
          </div>
        </div>

        {/* === CHAT INPUT === full-width below the plate */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.85 }}
          style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
        >
          <div
            style={{
              border: focused ? "1px solid var(--ember)" : "1px solid var(--ink)",
              transition: "border-color var(--dur-fast) var(--ease)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "stretch",
              background: "var(--paper-2)",
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
                color: "var(--ink)",
                minHeight: 56,
                maxHeight: 160,
              }}
            />
            <button
              type="button"
              onClick={() => submit()}
              aria-label="Ask Carbon"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "0 20px",
                border: 0,
                borderLeft: "1px solid var(--ink)",
                background: input.trim() ? "var(--ember)" : "var(--ink)",
                color: "var(--paper)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background var(--dur-fast) var(--ease)",
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
                color: "var(--ink-3)",
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
                  color: "var(--ink-2)",
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
                  color: "var(--ink-3)",
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
                  color: "var(--ink)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 2,
                }}
              >
                Use the form →
              </Link>
            </span>
          </div>
        </motion.div>

        {/* === FOOTER === paginated cover line */}
        <div
          style={{
            paddingTop: 20,
            borderTop: "1px solid var(--ink)",
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
              color: "var(--ink-3)",
            }}
          >
            Cover
          </span>
          <span
            className="hero-tagline"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-3)",
              textAlign: "center",
            }}
          >
            Carbon Specialty Insurance · Real estate &middot; California &amp; the Western United States
          </span>
          <span className="page-no">00 / 06</span>
        </div>
      </div>

      <style>{`
        .hero-nav-link:hover { border-bottom-color: var(--ember) !important; }
        .hero-try:hover { border-bottom-color: var(--ember) !important; color: var(--ink) !important; }
        @media (max-width: 960px) { .hero-nav { display: none !important; } }
        @media (max-width: 768px) {
          .hero-plate .col-8,
          .hero-plate .col-4 { grid-column: 1 / -1 !important; }
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
