export type FAQItem = { q: string; a: string };

// DRAFT — review before publishing
export const HOME_FAQ: FAQItem[] = [
  {
    q: "Do you write earthquake coverage?",
    // DRAFT — review before publishing
    a: "Yes. Earthquake is placed via the surplus-lines market (DIC — difference in conditions) on a separate limit. We routinely write EQ on California multifamily, mixed-use, and HOA schedules where the standard market won't bind it.",
  },
  {
    q: "What about vacant or unoccupied buildings?",
    // DRAFT — review before publishing
    a: "Vacant property is handled through specialty carriers. We need the reason for vacancy, the planned occupancy date, and any active construction or rehab work. Limits and deductibles look different than an occupied schedule — we'll walk you through what changes.",
  },
  {
    q: "How do you handle losses with prior claims?",
    // DRAFT — review before publishing
    a: "Prior losses get disclosed upfront in the loss runs. We place to carriers comfortable with the claim history — that may mean a higher-deductible structure or a different rating tier, but the goal is the same: a quote you can act on.",
  },
  {
    q: "Can you bind a building under construction?",
    // DRAFT — review before publishing
    a: "Yes — builders risk for ground-up multifamily and adaptive reuse. Quotes include soft costs, delayed opening, and a permanent property policy ready to bind at certificate of occupancy.",
  },
  {
    q: "How fast can you turn around a quote?",
    // DRAFT — review before publishing
    a: "Median bind time is 48 hours from a complete submission. The clock starts when we have rent rolls (or unit count + year built), current dec page, and loss runs. The chat or quote form gathers most of this; the specialist requests the rest.",
  },
  {
    q: "What if I'm switching from another agency mid-term?",
    // DRAFT — review before publishing
    a: "Mid-term broker-of-record changes are routine. We coordinate the BOR letter with your current agent and re-market only the policies where there's a clear advantage at renewal. No double-billing, no coverage gap.",
  },
];

export function FAQ({
  items,
  eyebrow = "06 — FAQ",
}: {
  items: FAQItem[];
  eyebrow?: string;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--ink)" }}>
      <span
        className="sr-only"
        style={{ position: "absolute", left: -9999 }}
      >
        {eyebrow}
      </span>
      {items.map((item) => (
        <details
          key={item.q}
          className="faq-item"
          style={{
            borderBottom: "1px solid var(--ink)",
            padding: "24px 0",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "1fr 32px",
              alignItems: "center",
              gap: 24,
              fontFamily: "var(--font-display)",
              fontSize: 22,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            <span>{item.q}</span>
            <span className="faq-mark" aria-hidden>+</span>
          </summary>
          <p
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--ink-2)",
              maxWidth: 720,
            }}
          >
            {item.a}
          </p>
        </details>
      ))}
      <style>{`
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item[open] .faq-mark { transform: rotate(45deg); }
        .faq-mark {
          font-family: var(--font-mono);
          font-size: 22px;
          color: var(--ember);
          transition: transform var(--dur-fast) var(--ease);
          justify-self: end;
        }
      `}</style>
    </div>
  );
}
