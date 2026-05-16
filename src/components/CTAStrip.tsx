"use client";

import { track } from "@/lib/analytics";
import { useChat } from "./ChatProvider";

export function CTAStrip() {
  const { open: onOpenChat } = useChat();
  return (
    <section
      style={{
        background: "var(--paper-2)",
        borderTop: "1px solid var(--ink)",
        borderBottom: "1px solid var(--ink)",
        padding: "72px var(--gutter)",
      }}
    >
      <div
        className="cta-grid"
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(32px, 5vw, 56px)",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          Put a real submission in front of <em style={{ fontStyle: "italic", color: "var(--ember)" }}>a specialist</em>.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              track("cs_quote_cta_clicked", { location: "cta_strip" });
              onOpenChat();
            }}
            style={{ padding: "18px 28px", fontSize: 14 }}
          >
            Open the Carbon chat
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            Direct phone is launching soon
          </span>
        </div>
      </div>
      <style>{`
        @media (max-width: 800px) {
          .cta-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </section>
  );
}
