"use client";

/**
 * AskCarbonStrip — sprint C.S.1.6.3 (revised in wrap-up).
 *
 * End-of-page CTA section for /coverage. Natural document flow — no
 * fixed positioning, no border (other than the single hairline ink
 * rule above), no shadow, no border-radius. Reads as the close of the
 * article rather than a floating chrome element.
 *
 * Editorial register: one-line lede in Plex Serif, "Ask Carbon →"
 * link in Plex Mono below. Opens the existing CarbonChat via
 * ChatProvider.
 *
 * The previous iteration was `position: fixed; bottom: 0`. Swapped
 * in the wrap-up after the operator pushed back on floating UI; the
 * editorial reading is stronger when the affordance sits at the end
 * of the read rather than chasing the reader down the page.
 */

import { track } from "@/lib/analytics";
import { useChat } from "./ChatProvider";

export function AskCarbonStrip({ source }: { source: string }) {
  const { open: onOpenChat } = useChat();

  return (
    <section
      aria-labelledby="ask-carbon-strip-lede"
      style={{
        background: "var(--paper)",
        borderTop: "1px solid var(--ink)",
        padding: "80px var(--gutter) 96px",
      }}
    >
      <div
        className="ask-carbon-strip-inner"
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <p
          id="ask-carbon-strip-lede"
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(28px, 3.6vw, 44px)",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            maxWidth: "22ch",
            textWrap: "balance",
          }}
        >
          Have a building you want priced?{" "}
          <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
            Ask Carbon.
          </em>
        </p>
        <button
          type="button"
          onClick={() => {
            track("cs_quote_cta_clicked", { location: "coverage_strip" });
            onOpenChat();
          }}
          data-source={source}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: 0,
            background: "transparent",
            border: 0,
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderBottom: "1px solid var(--ink)",
            paddingBottom: 4,
            transition: "border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
          }}
        >
          Ask Carbon
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
    </section>
  );
}
