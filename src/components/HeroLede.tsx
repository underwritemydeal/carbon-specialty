"use client";

/**
 * HeroLede — sprint C.S.1.5.
 *
 * Lifted out of the hero (which is now a full-bleed video block) into
 * its own paper-base section. Lede content + chat box behavior come
 * straight from C.S.1.4 — only the surrounding chrome changed.
 *
 *   Layout (desktop, 12-col container):
 *     lede   → cols 1-7
 *     chat   → cols 1-10
 *     padding: 96px top, 128px bottom
 *
 *   Mobile narrows the padding (48/64) and lets the grid collapse to
 *   single-column via the global @media rules.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
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

export function HeroLede() {
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

  return (
    <section
      aria-labelledby="hero-lede"
      className="hero-lede-section"
      style={{
        background: "var(--paper)",
        color: "var(--ink)",
        borderBottom: "1px solid var(--ink)",
      }}
    >
      <div className="container">
        <div className="grid-12" style={{ rowGap: 48 }}>
          {/* Lede — cols 1-7 */}
          <motion.p
            id="hero-lede"
            className="col-7 start-1"
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: EASE }}
            style={{
              margin: 0,
              fontFamily: "var(--font-body)",
              fontSize: "clamp(17px, 1.6vw, 20px)",
              lineHeight: 1.6,
              color: "var(--ink)",
              textWrap: "pretty",
              hyphens: "manual",
            }}
          >
            Real estate insurance for multifamily, mixed-use, SFR portfolios, HOAs, and
            apartment buildings.{" "}
            <em
              className="hero-lede-five-unit"
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

          {/* Chat box — cols 1-10 */}
          <motion.div
            className="col-10 start-1"
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Agent identity row above the textarea */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ink-2)",
              }}
            >
              <PulseDot />
              <span>Carbon · responding in seconds</span>
            </div>

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
              <div style={{ position: "relative", padding: "20px 22px 18px" }}>
                <label htmlFor="hero-lede-input" className="sr-only">
                  Tell Carbon about your building
                </label>
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
                        top: 20,
                        left: 22,
                        right: 22,
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
                  id="hero-lede-input"
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
        </div>
      </div>

      <style>{`
        .hero-lede-section { padding: 96px 0 128px; }
        @media (max-width: 1024px) { .hero-lede-section { padding: 64px 0 96px; } }
        @media (max-width: 600px)  { .hero-lede-section { padding: 48px 0 64px; } }
        .chat-secondary:hover { border-bottom-color: var(--ember) !important; color: var(--ink) !important; }

        /* C.S.1.6.2 — Mobile rhythm + accent polish at ≤480px.
           Hero-to-lede top padding tightens by ~25% (48 → 36) so the
           transition from full-bleed video into the lede paragraph
           reads as one continuous editorial moment, not two stacked
           sections. The "Five-unit walk-ups" italic shifts to pine
           as a brand accent in the lede. */
        @media (max-width: 480px) {
          .hero-lede-section { padding-top: 36px !important; }
          .hero-lede-five-unit { color: var(--ember) !important; }
        }
      `}</style>
    </section>
  );
}

function PulseDot() {
  return (
    <span aria-hidden className="pulse-dot">
      <style>{`
        .pulse-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
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
