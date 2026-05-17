"use client";

import { useState } from "react";
import { FadeUp } from "./motion-primitives";
import { HOME_FAQ, type FAQItem } from "@/lib/faq-data";

export { HOME_FAQ };
export type { FAQItem };

export function FAQ({ items = HOME_FAQ }: { items?: FAQItem[]; eyebrow?: string }) {
  return (
    <section
      id="faq"
      aria-labelledby="faq-headline"
      style={{
        background: "var(--paper)",
        borderBottom: "1px solid var(--ink)",
        paddingBlock: "112px 128px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Atmospheric photo behind the section at very low opacity (mocked
          with a subtle ink-on-paper texture until Higgsfield is unblocked) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 80% 30%, rgba(11,11,12,0.06) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(31,77,56,0.04) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative" }}>
        <FadeUp className="grid-12">
          <div className="col-7">
            <span className="page-no">06 — FAQ</span>
            <h2
              id="faq-headline"
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(40px, 6.5vw, 80px)",
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
                textWrap: "balance",
              }}
            >
              Questions{" "}
              <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
                we hear from operators.
              </em>
            </h2>
          </div>
          <div className="col-5 start-8 faq-marg">
            <span className="marginalia">
              Draft answers below — under broker review before launch.
            </span>
          </div>
        </FadeUp>

        <div className="rule" style={{ marginBlock: 80 }} />

        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item, i) => (
            <FadeUp key={item.q} delay={i * 0.04}>
              <FAQRow item={item} index={i} />
            </FadeUp>
          ))}
        </ol>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .faq-row { grid-template-columns: 1fr !important; row-gap: 16px; }
          .faq-marg { display: none; }
        }
      `}</style>
    </section>
  );
}

function FAQRow({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const ref = `06.${String(index + 1).padStart(2, "0")}`;
  return (
    <li
      style={{
        borderBottom: "1px solid var(--ink)",
        padding: "32px 0",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="faq-row grid-12"
        style={{
          appearance: "none",
          background: "transparent",
          border: 0,
          padding: 0,
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          columnGap: "var(--s-5)",
          alignItems: "flex-start",
        }}
      >
        <div
          className="col-3"
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: "0.18em",
              color: "var(--ember)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {ref}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            Question
          </span>
        </div>
        <div className="col-9" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(22px, 2.6vw, 32px)",
              lineHeight: 1.15,
              letterSpacing: "-0.015em",
              color: "var(--ink)",
              textWrap: "balance",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <span style={{ flex: 1 }}>{item.q}</span>
            <span
              aria-hidden
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 22,
                color: "var(--ember)",
                transform: open ? "rotate(45deg)" : "rotate(0deg)",
                transition: "transform var(--dur-fast) var(--ease)",
                lineHeight: 1,
              }}
            >
              +
            </span>
          </h3>
          {open && (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-body)",
                fontSize: 16,
                lineHeight: 1.7,
                color: "var(--ink-2)",
                maxWidth: 680,
                textWrap: "pretty",
              }}
            >
              {item.a}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
