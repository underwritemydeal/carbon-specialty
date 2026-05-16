// Server-safe data module. Lives outside "use client" boundaries so both
// Server Components (schema.ts JSON-LD generators) and Client Components
// (FAQ.tsx accordion) can share the source.

export type FAQItem = { q: string; a: string };

/* DRAFT — broker review */
export const HOME_FAQ: FAQItem[] = [
  {
    q: "Do you write earthquake coverage?",
    a: "Yes. Earthquake is placed via the surplus-lines market (DIC — difference in conditions) on a separate limit. We routinely write EQ on California multifamily, mixed-use, and HOA schedules where the standard market won’t bind it.",
  },
  {
    q: "What about vacant or unoccupied buildings?",
    a: "Vacant property is handled through specialty carriers. We need the reason for vacancy, the planned occupancy date, and any active construction or rehab work. Limits and deductibles look different than an occupied schedule — we’ll walk you through what changes.",
  },
  {
    q: "How do you handle losses with prior claims?",
    a: "Prior losses get disclosed upfront in the loss runs. We place to carriers comfortable with the claim history — that may mean a higher-deductible structure or a different rating tier, but the goal is the same: a quote you can act on.",
  },
  {
    q: "Can you bind a building under construction?",
    a: "Yes — builders risk for ground-up multifamily and adaptive reuse. Quotes include soft costs, delayed opening, and a permanent property policy ready to bind at certificate of occupancy.",
  },
  {
    q: "How fast can you turn around a quote?",
    a: "Turnaround depends on the schedule and what carriers ask for. The clock effectively starts when we have rent rolls (or unit count + year built), the current dec page, and loss runs. The chat or quote form gathers most of this; the specialist requests the rest and tells you up front when to expect an indication.",
  },
  {
    q: "What if I'm switching from another agency mid-term?",
    a: "Mid-term broker-of-record changes are routine. We coordinate the BOR letter with your current agent and re-market only the policies where there’s a clear advantage at renewal. No double-billing, no coverage gap.",
  },
];
