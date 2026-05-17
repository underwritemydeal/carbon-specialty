"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Wordmark } from "./Wordmark";
import { HeroVideo } from "./HeroVideo";
import { useChat } from "./ChatProvider";
import { track } from "@/lib/analytics";

const PLACEHOLDERS = [
  "24 units in Long Beach, 1962…",
  "Mixed-use, ground-floor retail, Pasadena…",
  "Builders risk, ADU project, San Diego…",
  "10-unit walk-up, recent fire. Help.",
  "Five-building portfolio, scattered-site SFR…",
];

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function Hero() {
  const router = useRouter();
  const { open: onOpenChat } = useChat();
  const [input, setInput] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (focused || input) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, [focused, input]);

  const submit = (msg?: string) => {
    const text = (msg ?? input).trim();
    track("cs_hero_input_submit", { has_text: Boolean(text), suggestion: msg ?? null });
    onOpenChat(text || undefined);
    setInput("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

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
        {/* === HEADER === wordmark / nav / Get a quote */}
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
                className="nav-link"
              >
                <span>{l.label}</span>
              </Link>
            ))}
          </nav>

          <Link href="/quote" className="btn" style={{ padding: "10px 18px", fontSize: 13 }}>
            Get a quote
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          </Link>
        </header>

        <div aria-hidden style={{ height: 1, background: "var(--ink)" }} />

        {/* === EYEBROW === section index + live status (pulse dot left of CARBON) */}
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
            className="col-6 hero-status"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "flex-end",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            <PulseDot />
            <span>Carbon · online · responding in seconds</span>
          </span>
        </div>

        {/* === HEADLINE === forced 2-line, italic pine "home." on its own line */}
        <motion.h1
          id="hero-headline"
          className="hero-h1"
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(56px, 8.5vw, 120px)",
            lineHeight: 1.04,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
            maxWidth: "14ch",
            textWrap: "balance",
          }}
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
          }}
        >
          {"Insuring the buildings that make our cities".split(" ").map((w, i) => (
            <Word key={i} reduce={reduce}>
              {w}
            </Word>
          ))}
          <br />
          <span style={{ display: "inline-block", marginTop: "0.2em" }}>
            <Accent reduce={reduce} stagger={9}>home.</Accent>
          </span>
        </motion.h1>

        {/* === PHOTO + LEDE === plate cols 1-8 + lede cols 9-12 */}
        <div className="grid-12 hero-plate" style={{ alignItems: "stretch", columnGap: 32, rowGap: 24, marginTop: 8 }}>
          <div className="col-8 start-1 hero-photo">
            <HeroVideo caption="Plate 01 — San Francisco · Alamo Square · 2026" />
          </div>

          <div
            className="col-4 start-9 hero-lede-col"
            style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 13 }}
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
                color: "var(--ink)",
                textWrap: "pretty",
                hyphens: "manual",
              }}
            >
              Real estate insurance for multifamily, mixed-use, SFR portfolios, HOAs, and
              apartment buildings.{" "}
              <em
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "1.05em",
                  color: "var(--ink)",
                }}
              >
                Five-unit walk-ups to billion-dollar schedules.
              </em>{" "}
              Placed across admitted markets, surplus lines, and specialty programs.
            </motion.p>
          </div>
        </div>

        {/* === CHAT BOX === multi-line textarea + side button + microcopy */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.85 }}
          style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
        >
          <div
            className="chat-box"
            style={{
              border: focused ? "1px solid var(--ember)" : "1px solid var(--ink)",
              transition: "border-color var(--dur-fast) var(--ease)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "stretch",
              background: "var(--paper-2)",
            }}
          >
            <div style={{ position: "relative", padding: "18px 20px 16px" }}>
              <label htmlFor="hero-input" className="sr-only">
                Tell Carbon about your building
              </label>
              {/* Cycling placeholder layered behind the textarea — cross-fade */}
              {!input && (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIdx}
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    style={{
                      position: "absolute",
                      top: 18,
                      left: 20,
                      right: 20,
                      pointerEvents: "none",
                      fontFamily: "var(--font-body)",
                      fontSize: 17,
                      lineHeight: 1.5,
                      color: "var(--ink-3)",
                    }}
                  >
                    {PLACEHOLDERS[placeholderIdx]}
                  </motion.span>
                </AnimatePresence>
              )}
              <textarea
                id="hero-input"
                ref={inputRef}
                rows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                onFocus={() => {
                  setFocused(true);
                  track("cs_hero_input_focus");
                }}
                onBlur={() => setFocused(false)}
                style={{
                  width: "100%",
                  resize: "vertical",
                  border: 0,
                  outline: "none",
                  background: "transparent",
                  fontFamily: "var(--font-body)",
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: "var(--ink)",
                  minHeight: 96,
                  display: "block",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => submit()}
              aria-label="Ask Carbon"
              className="chat-submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "0 28px",
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
                alignSelf: "stretch",
              }}
            >
              <span>Ask Carbon</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="4" y1="12" x2="20" y2="12" />
                <polyline points="14 6 20 12 14 18" />
              </svg>
            </button>
          </div>

          {/* Single secondary link right-aligned */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Link
              href="/quote"
              className="chat-secondary"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-2)",
                textDecoration: "none",
                borderBottom: "1px solid transparent",
                paddingBottom: 2,
                transition: "border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
              }}
            >
              Or use the standard quote form →
            </Link>
          </div>

          {/* Microcopy — even smaller mono small-caps */}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              textAlign: "right",
            }}
          >
            Reviewed by a specialist. Most submissions answered same business day.
          </span>
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
        .chat-secondary:hover { border-bottom-color: var(--ember) !important; color: var(--ink) !important; }
        @media (max-width: 960px) { .hero-nav { display: none !important; } }
        @media (max-width: 768px) {
          .hero-plate .col-8,
          .hero-plate .col-4 { grid-column: 1 / -1 !important; }
          .hero-tagline { display: none; }
          .hero-status > span { display: none; }
        }
      `}</style>
    </section>
  );
}

function Word({ children, reduce }: { children: React.ReactNode; reduce: boolean | null }) {
  return (
    <motion.span
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
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
        hidden: { opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.85, ease: EASE, delay: stagger * 0.05 + 0.2 },
        },
      }}
      style={{
        display: "inline-block",
        fontFamily: "var(--font-wordmark)",
        fontStyle: "italic",
        fontWeight: 400,
        color: "var(--ember)",
        paddingRight: "0.06em",
      }}
    >
      {children}
    </motion.em>
  );
}

function PulseDot() {
  return (
    <span aria-hidden className="pulse-dot">
      <style>{`
        .pulse-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--ember);
          animation: pulse-dot-anim 2s ease-in-out infinite;
        }
        @keyframes pulse-dot-anim {
          0%   { opacity: 1; }
          50%  { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-dot { animation: none; opacity: 1; }
        }
      `}</style>
    </span>
  );
}
