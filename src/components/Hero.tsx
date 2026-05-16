"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { useChat } from "./ChatProvider";

const PLACEHOLDERS = [
  "24 units in Long Beach, 1962…",
  "Mixed-use in Oakland, need EQ…",
  "Just give me a phone number.",
  "Builders risk, ground-up multifamily.",
  "SFR portfolio · 80 doors · Phoenix.",
  "Renewal on a 6-building schedule, May.",
  "10-unit walk-up, recent fire. Help.",
];

const SUGGESTIONS = ["Speak to someone", "Open the form", "Tell Carbon about my building"];

const emStyle: React.CSSProperties = {
  fontStyle: "italic",
  color: "var(--ember)",
};

const HEADLINES = [
  <>
    Insurance for the buildings{" "}
    <em style={emStyle}>California</em>
    {" "}can&apos;t afford to lose.
  </>,
  <>
    Insurance for the buildings{" "}
    <em style={emStyle}>the West</em>
    {" "}can&apos;t afford to lose.
  </>,
];

export function Hero() {
  const router = useRouter();
  const { open: onOpenChat } = useChat();
  const [input, setInput] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focused || input) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 2600);
    return () => clearInterval(id);
  }, [focused, input]);

  useEffect(() => {
    const id = setInterval(() => setHeadlineIdx((i) => (i + 1) % HEADLINES.length), 6500);
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

  return (
    <section
      aria-labelledby="hero-headline"
      style={{
        position: "relative",
        padding: "56px var(--gutter) 72px",
        borderBottom: "1px solid var(--ink)",
        background: "var(--paper)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--ink) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          opacity: 0.04,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", position: "relative" }}>
        <div
          className="hero-eyebrow"
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 56,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          <span>00 — Get a quote</span>
          <span aria-hidden style={{ flex: 1, height: 1, background: "var(--ink)" }} />
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ember)" }}
          >
            <PulseDot /> Carbon · online · responding in seconds
          </span>
        </div>

        {/* First paragraph optimized for AEO: Carbon Specialty, real estate insurance, apartment buildings, California, Western US, multifamily */}
        <h1
          id="hero-headline"
          style={{
            margin: "0 0 14px",
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(40px, 6vw, 64px)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
            maxWidth: 900,
            minHeight: "1.1em",
          }}
        >
          <HeadlineCycle index={headlineIdx} headlines={HEADLINES} />
        </h1>
        <p
          style={{
            margin: "0 0 40px",
            fontFamily: "var(--font-body)",
            fontSize: 17,
            lineHeight: 1.5,
            color: "var(--ink-2)",
            maxWidth: 720,
          }}
        >
          Carbon Specialty writes real estate insurance for multifamily, mixed-use, SFR portfolios,
          HOAs, and apartment buildings — California-led, Western United States–licensed, placed
          across admitted, surplus-lines, and program-business carriers.
        </p>

        <div
          style={{
            border: `1px solid ${focused ? "var(--ember)" : "var(--ink)"}`,
            background: "var(--paper)",
            transition: "border-color var(--dur-fast) var(--ease)",
            maxWidth: 880,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderBottom: "1px solid var(--ink)",
              background: "var(--paper-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PulseDot />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                Carbon — AI agent
              </span>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              Specialist-reviewed
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
            <label htmlFor="hero-input" className="sr-only" style={{ position: "absolute", left: -9999 }}>
              Describe your building
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
                flex: 1,
                resize: "none",
                border: 0,
                outline: "none",
                background: "transparent",
                padding: "26px 24px",
                fontFamily: "var(--font-body)",
                fontSize: 18,
                lineHeight: 1.45,
                color: "var(--ink)",
                minHeight: 64,
                maxHeight: 160,
                borderRadius: 0,
              }}
            />
            <button
              type="button"
              onClick={() => submit()}
              aria-label="Ask Carbon"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "0 28px",
                border: 0,
                borderLeft: "1px solid var(--ink)",
                background: input.trim() ? "var(--ember)" : "var(--ink)",
                color: "var(--paper)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 0,
                transition: "background var(--dur-fast) var(--ease)",
                minWidth: 120,
              }}
            >
              <span>Ask Carbon</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="4" y1="12" x2="20" y2="12" />
                <polyline points="14 6 20 12 14 18" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 880 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              alignSelf: "center",
              marginRight: 6,
            }}
          >
            try
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="suggestion"
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid var(--ink)",
                borderRadius: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink)",
                cursor: "pointer",
                transition:
                  "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div
          className="hero-meta"
          style={{
            marginTop: 64,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            borderTop: "1px solid var(--ink)",
            paddingTop: 20,
          }}
        >
          {[
            ["Specialty", "Real estate"],
            ["Geography", "Western US"],
            ["Workflow", "AI-assisted"],
            ["Method", "Specialist-reviewed"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                }}
              >
                {k}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .suggestion:hover { background: var(--ink); color: var(--paper); }
        @media (max-width: 768px) {
          .hero-meta { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
        }
      `}</style>
    </section>
  );
}

function HeadlineCycle({
  index,
  headlines,
}: {
  index: number;
  headlines: React.ReactNode[];
}) {
  return (
    <span key={index} className="hero-fade">
      {headlines[index]}
      <style>{`
        .hero-fade { display: inline-block; animation: hero-fade-in var(--dur-slow) var(--ease); }
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-fade { animation: hero-fade-in-soft 200ms linear; }
          @keyframes hero-fade-in-soft { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </span>
  );
}

function PulseDot() {
  return (
    <span
      aria-hidden
      style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--ember)",
          animation: "carbon-pulse 1.8s ease-out infinite",
        }}
      />
      <span
        style={{
          position: "relative",
          width: 8,
          height: 8,
          background: "var(--ember)",
        }}
      />
      <style>{`
        @keyframes carbon-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          80%, 100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </span>
  );
}
