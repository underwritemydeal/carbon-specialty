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
import { motion, useReducedMotion } from "motion/react";
import { useChat } from "./ChatProvider";
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/voice-client";
import { track } from "@/lib/analytics";

// C.S.1.9 — Single static placeholder replaces the rotating array.
// One clear prompt reads more deliberate than five novelty addresses
// cycling every 3.5s.
const TEXTAREA_PLACEHOLDER =
  "Tell us about your property — location, type, how many units...";

// C.S.1.9 — Update these constants when the destinations are ready.
// STANDARD_FORM_URL points at the "Prefer a form?" CTA in the intake
// widget; SCHEDULE_URL points at the Cal.com booking page beneath it.
const STANDARD_FORM_URL = "/contact";
const SCHEDULE_URL = "https://cal.com/carbonspecialty";

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function HeroLede() {
  const router = useRouter();
  const { open: onOpenChat } = useChat();
  const [input, setInput] = useState("");
  // C.S.1.9 — `focused` retained for the focus-color border swap on
  // the chat box; the rotating-placeholder state it used to gate was
  // removed alongside the PLACEHOLDERS array.
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
            </em>
          </motion.p>

          {/* C.S.1.9 — Carrier credibility line. Sits between the lede
              paragraph and the intake widget at the full content
              column width. Mono caps in ink. Spec margins: 1.5rem
              from the paragraph above, 1.5rem before the widget. The
              col-12 wrapper around carrier + widget + schedule + meta
              owns those margins explicitly; the grid's rowGap only
              applies between the lede <p> (row 1) and this wrapper
              (row 2). */}
          <div
            className="col-12 start-1"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <span
              className="hero-lede-carriers"
              style={{
                marginTop: 0,
                marginBottom: "1.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink)",
                textWrap: "balance",
              }}
            >
              Placed with Travelers, Hartford, Liberty Mutual, Nationwide, Chubb, and 60+ programs through our carrier network.
            </span>

          {/* C.S.1.9 — Intake widget. Full-width two-column grid:
                · Left  — AI conversation path (label + chat-box)
                · Right — Standard form path ("Prefer a form?" + CTA)
              Single 1px ink divider absolutely centered between the
              columns at 60% height. On tablet (≤768px) and mobile
              (≤480px) the columns stack vertically and the divider
              becomes a horizontal 1px rule. */}
          <motion.div
            className="intake-widget"
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
            style={{ position: "relative" }}
          >
            <div className="intake-grid">
              {/* LEFT — AI conversation path */}
              <div className="intake-col intake-col--left">
                <span className="intake-label">Start a conversation with Carbon</span>
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
                  // C.S.1.9 — single static placeholder. Rotating
                  // overlay (AnimatePresence + PLACEHOLDERS array)
                  // removed.
                  placeholder={TEXTAREA_PLACEHOLDER}
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
                    supported. Mono register, opacity 0.6. */}
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
              </div>
              {/* end intake-col--left */}

              {/* RIGHT — Standard form path */}
              <div className="intake-col intake-col--right">
                <div className="intake-form-container">
                  <h3 className="intake-form-heading">Prefer a form?</h3>
                  <Link
                    href={STANDARD_FORM_URL}
                    className="intake-form-cta"
                  >
                    Use our intake form →
                  </Link>
                </div>
              </div>

              {/* Divider — single 1px ink line, absolutely positioned at
                  the center of the grid at 60% height on desktop. On
                  ≤768px the divider class becomes a horizontal 1px rule
                  in the column flow (see CSS). */}
              <div className="intake-divider" aria-hidden />
            </div>
          </motion.div>

          {/* C.S.1.9 — Schedule call link, directly below the widget.
              Linked text is pine, underlines on hover. */}
          <div
            className="hero-lede-schedule-line"
            style={{
              marginTop: "1.25rem",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            Prefer to talk through it?{" "}
            <a
              href={SCHEDULE_URL}
              className="hero-lede-schedule-link"
              style={{
                color: "var(--ember)",
                textDecoration: "none",
                borderBottom: "1px solid transparent",
                paddingBottom: 1,
                transition: "border-color var(--dur-fast) var(--ease)",
              }}
            >
              Schedule a call →
            </a>
          </div>

          <span
            style={{
              marginTop: 24,
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
        </div>
        {/* end col-12 wrapper */}
        </div>
      </div>

      <style>{`
        .hero-lede-section { padding: 96px 0 128px; }
        @media (max-width: 1024px) { .hero-lede-section { padding: 64px 0 96px; } }
        @media (max-width: 600px)  { .hero-lede-section { padding: 48px 0 64px; } }

        /* C.S.1.9 — Intake widget. Two equal columns separated by a
           1px ink divider at 60% height, absolutely centered. Left
           column is the AI conversation path (label + chat-box).
           Right column is the standard-form path (bordered container
           with heading + CTA). On ≤768px the columns stack and the
           divider becomes a horizontal 1px rule. */
        .intake-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 48px;
          row-gap: 32px;
          align-items: stretch;
          position: relative;
        }
        .intake-col { display: flex; flex-direction: column; gap: 14px; }
        .intake-col--right { gap: 0; }
        .intake-label {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .intake-divider {
          position: absolute;
          left: 50%;
          top: 20%;
          bottom: 20%;
          width: 1px;
          background: var(--ink);
          transform: translateX(-50%);
        }
        .intake-form-container {
          flex: 1;
          border: 1px solid var(--ink);
          background: var(--paper);
          border-radius: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 32px 28px;
          min-height: 100%;
          text-align: center;
        }
        .intake-form-heading {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 18px;
          line-height: 1.3;
          color: var(--ink);
        }
        .intake-form-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 20px;
          border: 1px solid var(--ember);
          background: var(--ember);
          color: var(--paper);
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          border-radius: 0;
          transition: background var(--dur-fast) var(--ease),
                      color var(--dur-fast) var(--ease);
        }
        .intake-form-cta:hover {
          background: var(--ember-ink);
          border-color: var(--ember-ink);
          color: var(--paper);
        }

        /* C.S.1.9 — Schedule call link: pine text, no underline at
           rest, underline on hover. */
        .hero-lede-schedule-link:hover { border-bottom-color: var(--ember) !important; }

        /* Tablet + mobile: stack the columns, divider becomes a
           horizontal 1px rule. ≤768px is the spec breakpoint. */
        @media (max-width: 768px) {
          .intake-grid {
            grid-template-columns: 1fr;
            column-gap: 0;
          }
          .intake-divider {
            position: static;
            width: 100%;
            height: 1px;
            transform: none;
            top: auto;
            bottom: auto;
            left: auto;
            order: 2;
          }
          .intake-col--left { order: 1; }
          .intake-col--right { order: 3; }
        }

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
           The .hero-lede paragraph forces flex-column with zero gap so
           per-line margins control rhythm. font-family is overridden
           to var(--font-display) (IBM Plex Serif) so both lines
           land in the same serif register.

           The chat box stacks vertically: textarea on top, "Ask Carbon
           →" full-width below (pine fill, paper text, 64px tall). */
        @media (max-width: 480px) {
          /* Reshape the lede paragraph. C.S.1.10: dropped from 24px
             to 19px to land inside the 18-20px readability band on
             phones. The italic pull-quote below stays at 32px — it's
             the editorial focal point of the body lede. */
          #hero-lede {
            display: flex !important;
            flex-direction: column !important;
            font-family: var(--font-display) !important;
            font-size: 19px !important;
            line-height: 1.45 !important;
          }
          #hero-lede .hero-lede-s1 {
            font-size: 19px;
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

