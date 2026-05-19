/**
 * Disclaimers — sprint C.S.1.7.0k.
 *
 * Three locked disclaimer strings + a detection helper. The route
 * concatenates the appropriate disclaimer(s) to the model's response
 * POST-STREAM rather than relying on the model to paste them. This
 * keeps the disclaimers exact, audit-friendly, and impossible to
 * paraphrase away.
 *
 * Why post-stream and not in the prompt:
 *   - Models drift. Asking the model to repeat a 4-sentence disclaimer
 *     verbatim every turn is a recipe for "almost-the-disclaimer" output
 *     that fails compliance review.
 *   - Length. The disclaimer text alone is a meaningful slice of the
 *     prompt; keeping it server-side keeps the prompt cache stable.
 *   - Audit. A regulator or carrier asking "show me what the chat
 *     actually told prospects" gets a deterministic answer.
 *
 * Strings in this file are LOCKED — changes here are a brokerage /
 * compliance decision, not an engineering one. Touching the wording
 * needs sign-off and probably a separate sprint.
 */

/* =========================================================================
 * The three locked disclaimers
 * ========================================================================= */

/** Attached to any response that mentions a price range, indication,
 *  rate, premium dollar amount, or any number framed as cost. */
export const DISCLAIMER_INDICATION =
  "Indication ranges are market-level estimates, not quotes. Actual premium depends on the full schedule, loss runs, current carrier appetite, and underwriter review. Carbon Specialty Insurance is a licensed brokerage; nothing here binds coverage.";

/** Attached to any response that mentions coverage scope, whether
 *  something is covered, or what a policy includes/excludes. The
 *  hard-handoff trigger for coverage interpretation takes priority,
 *  but lighter coverage-scope discussion (e.g. explaining the
 *  property-only vs property+liability vs full-package options during
 *  intake) still ships with this line. */
export const DISCLAIMER_COVERAGE_SCOPE =
  "Coverage descriptions here are general. Specific coverage, exclusions, and terms live in the policy a specialist will prepare; the policy controls in every case.";

/** Attached whenever the chat surfaces property facts that came from
 *  public records (parcel data, year built, square footage, owner of
 *  record). Public records lag and miscode; the disclaimer protects
 *  against a prospect treating the chat's recital as authoritative. */
export const DISCLAIMER_DATA_SOURCE =
  "Property facts above are pulled from public county and parcel records and may be outdated or incomplete. Confirm specifics on the actual schedule when the specialist follows up.";

/** Ordered tuple — used by tests and by the appender to guarantee a
 *  stable order when multiple disclaimers fire on the same turn. */
export const LOCKED_DISCLAIMERS = [
  DISCLAIMER_INDICATION,
  DISCLAIMER_COVERAGE_SCOPE,
  DISCLAIMER_DATA_SOURCE,
] as const;

export type DisclaimerKind = "indication" | "coverage_scope" | "data_source";

/* =========================================================================
 * Detection
 *
 * Trigger heuristics are intentionally generous on indication +
 * data_source detection — false positives (adding a disclaimer when
 * one wasn't strictly needed) cost a few extra sentences in the user's
 * view; false negatives (missing a disclaimer when pricing was
 * discussed) cost regulatory exposure.
 * ========================================================================= */

const INDICATION_PATTERNS: RegExp[] = [
  /\$[\d,]+/,                          // any dollar amount
  /\bper\s*\$?100\b/i,                 // "per $100" / "per 100"
  /\bindication(s)?\b/i,
  /\brate(s)?\b/i,                     // "rate", "rates"
  /\bpremium(s)?\b/i,
  /\bprice(d|s|ing)?\b/i,              // price, priced, prices, pricing
  /\bquote(s|d)?\b/i,
  /\bcost(s|ing)?\b/i,
  /\bannual\s+(premium|cost)\b/i,
  /\b\d+(\.\d+)?\s*[–-]\s*\d+(\.\d+)?\s*(per|cents|\/)/i, // "0.45 – 0.95 per"
  /\b\d+(\.\d+)?\s*(cents|c)\s*(per|\/)/i,
  /\b(running|landing|coming in)\b.*\b(at|around|near)\b.*\b\d/i, // "running around 0.65"
];

const COVERAGE_SCOPE_PATTERNS: RegExp[] = [
  /\bproperty\s*(only\b|\+|and\s+liability\b)/i,
  /\bgeneral\s+liability\b/i,
  /\bEPLI\b/,
  /\bD&O\b/,
  /\bumbrella\b/i,
  /\bfull\s+package\b/i,
  /\b(does|will)\s+(it|the policy|your policy|coverage)\s+(cover|include|exclude)\b/i,
  /\b(is|are)\s+\w+\s+covered\b/i,
  /\bcovered\s+(under|by|for)\b/i,
];

const DATA_SOURCE_PATTERNS: RegExp[] = [
  /\b(records|county|parcel|public\s+records?)\s+(show|indicate|say|list|publish)\b/i,
  /\bbuilt\s+in\s+\d{4}\b/i,
  /\byear\s+built\b/i,
  /\bsquare\s+feet\b/i,
  /\bsquare\s+footage\b/i,
  /\bsq\s*ft\b/i,
  /\bparcel\s+(id|number)\b/i,
  /\bowner\s+of\s+record\b/i,
  /\bI\s+see\s+\d+\s+\w+/i,           // "I see 1247 Pine Ave..."
  /\bcanonical\s+address\b/i,
  /\bland\s+use\b/i,
];

/** Detect which disclaimers a given assistant message triggers. Empty
 *  array if none. Order matches LOCKED_DISCLAIMERS. */
export function detectDisclaimers(text: string): DisclaimerKind[] {
  if (!text) return [];
  const kinds: DisclaimerKind[] = [];
  if (INDICATION_PATTERNS.some((re) => re.test(text))) kinds.push("indication");
  if (COVERAGE_SCOPE_PATTERNS.some((re) => re.test(text))) kinds.push("coverage_scope");
  if (DATA_SOURCE_PATTERNS.some((re) => re.test(text))) kinds.push("data_source");
  return kinds;
}

/** Map a kind to its locked string. */
export function disclaimerFor(kind: DisclaimerKind): string {
  switch (kind) {
    case "indication": return DISCLAIMER_INDICATION;
    case "coverage_scope": return DISCLAIMER_COVERAGE_SCOPE;
    case "data_source": return DISCLAIMER_DATA_SOURCE;
  }
}

/* =========================================================================
 * Appender — used by /api/chat to concat disclaimers post-stream
 *
 * Idempotent: if the model already pasted a disclaimer verbatim (it
 * shouldn't, but defense in depth), the appender deduplicates by
 * exact-string match before appending.
 * ========================================================================= */

export interface AppendResult {
  /** The text with disclaimers appended (or unchanged if none applied). */
  text: string;
  /** Which disclaimer kinds were appended on this turn. */
  applied: DisclaimerKind[];
}

export function appendDisclaimers(text: string, kinds?: DisclaimerKind[]): AppendResult {
  const detected = kinds ?? detectDisclaimers(text);
  if (detected.length === 0) return { text, applied: [] };

  const applied: DisclaimerKind[] = [];
  let out = text.trimEnd();

  for (const kind of detected) {
    const line = disclaimerFor(kind);
    if (out.includes(line)) continue; // model already pasted it; don't double up
    out += `\n\n— ${line}`;
    applied.push(kind);
  }

  return { text: out, applied };
}
