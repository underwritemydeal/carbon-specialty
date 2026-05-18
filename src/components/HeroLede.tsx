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

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { useChat } from "./ChatProvider";
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/voice-client";
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

  // C.S.1.6.5 — voice-enabled mic inside the hero textarea. Same
  // SpeechRecognition lifecycle the CarbonChat panel uses; identical
  // UX pattern so the user gets the same on/off semantics in both
  // places. Voice support is feature-detected after mount so the SSR
  // snapshot never paints a mic the runtime can't honor (iOS Chrome).
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceCommittedRef = useRef<string>("");
  const inputForVoiceRef = useRef<string>("");

  useEffect(() => {
    if (focused || input) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, [focused, input]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    inputForVoiceRef.current = input;
  }, [input]);

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

  // -------------------------------------------------------------------------
  // C.S.1.6.5 — Voice input lifecycle (Web Speech API). Mirror of the
  // implementation inside CarbonChat — same on/off semantics, same
  // continuous + interim results pattern, same final-on-stop commit.
  // -------------------------------------------------------------------------
  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // Webkit throws if stop() races with onend — ignore.
    }
  }, []);

  const startListening = useCallback(() => {
    if (listening) return;
    if (!isSpeechRecognitionSupported()) return;
    let Ctor: new () => SpeechRecognitionLike;
    try {
      Ctor = getSpeechRecognitionCtor();
    } catch {
      setVoiceSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    voiceCommittedRef.current = inputForVoiceRef.current;

    rec.onresult = (event) => {
      let nextInterim = "";
      let appended = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) appended += transcript;
        else nextInterim += transcript;
      }
      if (appended) {
        const base = voiceCommittedRef.current;
        const next = `${base}${base && !base.endsWith(" ") ? " " : ""}${appended}`.trim();
        voiceCommittedRef.current = next;
        setInput(next);
        inputForVoiceRef.current = next;
      }
      setInterim(nextInterim.trim());
    };
    rec.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("[hero-lede] STT error:", event.error, event.message);
      }
    };
    rec.onend = () => {
      setInterim((current) => {
        if (current.trim().length > 0) {
          const base = voiceCommittedRef.current;
          const next = `${base}${base && !base.endsWith(" ") ? " " : ""}${current}`.trim();
          voiceCommittedRef.current = next;
          setInput(next);
          inputForVoiceRef.current = next;
        }
        return "";
      });
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
    } catch (e) {
      console.warn("[hero-lede] STT start failed:", e);
      return;
    }
    recognitionRef.current = rec;
    setListening(true);
    track("cs_chat_mic_start");
  }, [listening]);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

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
            {/* Three semantic chunks so mobile (≤480px) can reshape this
                into a stacked editorial spread: 24px Plex Serif lede,
                32px Plex Serif italic pine pull-quote with 2x vertical
                breathing room, 20px Plex Serif coda. Desktop renders
                them inline as before via the default `display: inline`
                on <span>. Sprint C.S.1.6.4. */}
            <span className="hero-lede-s1">
              Carbon specializes in real estate insurance for investment property owners.
            </span>{" "}
            <em
              className="hero-lede-five-unit"
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "1.05em",
                color: "var(--ink)",
              }}
            >
              Five units to billion-dollar schedules.
            </em>{" "}
            <span className="hero-lede-s3">
              We take pride in knowing which carriers and programs deliver the broadest
              coverage and the most competitive rates in every region of the country.
            </span>
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
            {/* Agent identity row above the textarea. Hidden on mobile
                (≤480px) per sprint C.S.1.6.4 — the status pulse only
                renders inside the CarbonChat panel header now, not as
                page-level chrome. */}
            <div
              className="hero-lede-identity"
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
              <div className="chat-text-wrap" style={{ position: "relative", padding: "20px 22px 18px" }}>
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
                  className="hero-lede-textarea"
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
                    ...(listening && interim
                      ? { color: "transparent", caretColor: "var(--ink)" as const }
                      : {}),
                  }}
                />
                {/* C.S.1.6.5 — Interim transcript overlay (mirror of the
                    CarbonChat pattern). Renders the committed input in
                    normal ink plus the interim portion at opacity 0.6
                    while the mic is hot. */}
                {listening && interim && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 20,
                      left: 22,
                      right: 22,
                      pointerEvents: "none",
                      fontFamily: "var(--font-body)",
                      fontSize: 17,
                      lineHeight: 1.5,
                      color: "var(--ink)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {input}
                    {input && !input.endsWith(" ") ? " " : ""}
                    <span style={{ opacity: 0.6 }}>{interim}</span>
                  </div>
                )}
                {/* C.S.1.6.5 — Mic button inside the textarea, right
                    side. Renders only after the feature-detect probe
                    completes so iOS Chrome (no SpeechRecognition)
                    never paints a control the runtime can't honor.
                    Same on/off pattern as the CarbonChat panel mic. */}
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={listening ? "Stop dictation" : "Dictate your reply"}
                    aria-pressed={listening}
                    className="hero-lede-mic"
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      padding: 0,
                      border: `1px solid ${listening ? "var(--ember)" : "var(--ink)"}`,
                      background: listening ? "var(--ember)" : "transparent",
                      color: listening ? "var(--paper)" : "var(--ink)",
                      cursor: "pointer",
                      borderRadius: 0,
                      transition:
                        "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={listening ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={listening ? 0 : 1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="9" y="3" width="6" height="12" rx="3" />
                      <path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth={1.5} />
                      <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth={1.5} />
                    </svg>
                  </button>
                )}
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

            {/* C.S.1.6.5 — Voice-enabled caption (mobile-only). Renders
                below the chat box at ≤480px when SpeechRecognition is
                supported. Mono register, opacity 0.6. The hero chat
                affordance + this caption together communicate that the
                user can type or speak, and that Carbon speaks back. */}
            {voiceSupported && (
              <span
                className="hero-lede-voice-caption"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  opacity: 0.6,
                  display: "none",
                }}
              >
                Voice-enabled · type or speak · Carbon speaks back
              </span>
            )}

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

        /* C.S.1.6.4 — Mobile body lede reshape + chat input restructure.
           The lede paragraph becomes a vertical editorial spread:
             · sentence 1 — 24px Plex Serif, plain
             · sentence 2 — 32px Plex Serif italic pine, double vertical
               breathing room above and below (this is the pull-quote)
             · sentence 3 — 20px Plex Serif
           The .hero-lede paragraph forces flex-column with zero gap so
           per-line margins control rhythm. font-family is overridden
           to var(--font-display) (IBM Plex Serif) so all three lines
           land in the same serif register.

           The chat box stacks vertically: textarea on top, "Ask Carbon
           →" full-width below (pine fill, paper text, 56px tall). The
           page-level pulse identity row is hidden — the pulse now only
           exists in the CarbonChat panel header. */
        @media (max-width: 480px) {
          /* Reshape the lede paragraph. */
          #hero-lede {
            display: flex !important;
            flex-direction: column !important;
            font-family: var(--font-display) !important;
            font-size: 24px !important;
            line-height: 1.32 !important;
          }
          #hero-lede .hero-lede-s1 {
            font-size: 24px;
            color: var(--ink);
          }
          #hero-lede .hero-lede-five-unit {
            display: block;
            font-size: 32px !important;
            line-height: 1.18 !important;
            margin-block: 36px !important;
            font-family: var(--font-display) !important;
            font-style: italic !important;
            color: var(--ember) !important;
          }
          #hero-lede .hero-lede-s3 {
            font-size: 20px;
            color: var(--ink-2);
          }

          /* Hide the page-level pulse identity row. */
          .hero-lede-identity { display: none !important; }

          /* Chat box stacks. */
          .chat-box {
            grid-template-columns: 1fr !important;
          }
          .chat-text-wrap {
            /* Right padding bumped to 60px to leave room for the mic
               button absolutely positioned at top:14 / right:14. */
            padding: 18px 60px 16px 18px !important;
          }
          .chat-submit {
            border-left: 0 !important;
            border-top: 1px solid var(--ink) !important;
            /* C.S.1.6.5 — button height 56 → 64; pine fill is the
               primary affordance for the post-hero viewport. */
            height: 64px !important;
            justify-content: center !important;
            background: var(--ember) !important;
            color: var(--paper) !important;
            font-size: 13px !important;
            letter-spacing: 0.24em !important;
          }
        }

        /* C.S.1.6.5 — Mobile chat dominance. The chat box becomes the
           dominant element of the next viewport after the hero + body
           lede. Textarea grows to min-height 120px (≈4 visible lines
           of the rotating placeholder at 17px / line-height 1.5). The
           voice-enabled caption renders below the Ask Carbon button. */
        @media (max-width: 480px) {
          .hero-lede-textarea {
            min-height: 120px !important;
          }
          .hero-lede-voice-caption {
            display: inline-block !important;
            text-align: center;
            width: 100%;
            margin-top: 4px;
          }
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
