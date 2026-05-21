/**
 * Rate bands — sprint C.S.1.7.0k.
 *
 * Carbon does not quote pricing in chat, but it can share an INDICATION
 * RANGE — a coarse "carriers in this market are landing here right now"
 * signal — when enough underwriting context is in hand (asset class,
 * state, units, vintage). The range is paired with a locked disclaimer
 * (see ./disclaimers.ts) and ends with the same handoff template the
 * intake uses for the other triggers.
 *
 * Shape of the data
 * -----------------
 * Indications are expressed as cents per $100 of insured value
 * (industry-standard "rate per hundred"). The low/mid/high triple lets
 * the chat surface a range rather than a single number:
 *
 *   { low: 0.45, mid: 0.65, high: 0.95 }
 *
 *   "Indications for buildings like yours are running 0.45 to 0.95 per
 *    $100 — a 100-unit building at $30M TIV is roughly $135k–$285k
 *    annual premium."
 *
 * Bands are keyed:
 *
 *   assetClass → state → unitBand → vintageBand → RateBand
 *
 * Sprint C.S.1.7.0k seeds multifamily across CA / AZ / NV with the four
 * unit bands and three vintage bands listed in the brief. Values in
 * this file are PLACEHOLDER and exist to wire the pipeline end-to-end.
 * Real values land in a separate data PR — they're a brokerage call,
 * not an engineering one, and they'll be sourced from the agency's
 * recent bind sheet rather than guessed at by code.
 *
 * Future expansion (NOT in this sprint):
 *   - mixed_use, sfr_portfolio, hoa, condo_unit, small_commercial_re,
 *     builders_risk asset classes
 *   - More states (TX, FL, CO, WA, OR) as Carbon's appetite expands
 *   - Sub-bands within multifamily (garden vs mid-rise vs high-rise)
 *   - EQ + flood add-on multipliers
 *
 * Why the lookup is a static table (not a model call):
 *   - Deterministic. Same inputs always produce the same range.
 *   - Auditable. A broker can open this file and see every number.
 *   - Cache-friendly. The rate-band slice is the only part of the
 *     system prompt that changes per turn; the stable prompt above it
 *     stays cached. The route assembles the two-block system payload —
 *     see /api/chat (the stable prompt comes from buildSystemPrompt).
 */

/* =========================================================================
 * Types
 * ========================================================================= */

/** Asset classes Carbon writes. Mirrors CarbonIntakePayload['asset_class']
 *  minus `unknown` (the table can't return a range for "unknown").
 *  Narrowed in C.S.1.7.1 to the four habitational classes — condo_unit,
 *  small_commercial_re, and builders_risk are out of appetite as of the
 *  habitational COPE intake rewrite. */
export type RateBandAssetClass =
  | "multifamily"
  | "mixed_use"
  | "sfr_portfolio"
  | "hoa";

/** Two-letter state codes the table covers. Empty for asset classes
 *  Carbon hasn't seeded yet. Carbon's footprint is CA-heavy; AZ + NV
 *  are the adjacent markets the agency places into. */
export type RateBandState = "CA" | "AZ" | "NV";

/** Unit count buckets. Pricing is materially different per size class:
 *  duplex/triplex pricing differs from a 100+ unit mid-rise. */
export type RateBandUnitBand =
  | "1-4"      // duplex / triplex / fourplex
  | "5-49"     // small to mid garden-style
  | "50-149"   // large garden / small mid-rise
  | "150+";    // mid-rise / high-rise

/** Vintage buckets. Older buildings price up due to ITV/replacement
 *  cost gaps, code, and loss history; newer construction prices down. */
export type RateBandVintageBand =
  | "pre_1970"      // older — frame, knob & tube risk, ordinance & law
  | "1970_1999"     // mid-vintage — typical wood frame garden
  | "2000_plus";    // newer — modern frame / type V

/** A single indication band. All values are USD cents per $100 of TIV. */
export interface RateBand {
  /** Low end of the indication range. */
  low: number;
  /** Midpoint — what the chat reaches for when surfacing a single number. */
  mid: number;
  /** High end. */
  high: number;
  /** Optional source tag — useful when real values land. "placeholder"
   *  marks the seed values; "agency-2026-q1-binds" or similar would
   *  replace them in the data PR. */
  source?: string;
}

/** Context the lookup needs from the intake conversation. Each field
 *  optional — the lookup returns null when it can't resolve all four. */
export interface RateBandContext {
  asset_class?: RateBandAssetClass | "unknown";
  state?: string;          // two-letter or longhand; normalized internally
  unit_count?: number;
  year_built?: number;
}

/* =========================================================================
 * Data — placeholder values
 *
 * All numbers in this block are PLACEHOLDERS. They wire the system
 * end-to-end so the slice composer, disclaimer concatenation, and
 * tests can run, but they should not be quoted to prospects as real
 * indications. Real values land in a separate data PR sourced from
 * the agency's recent binds.
 *
 * Editor note: structured as a nested object literal rather than a
 * function so the shape is reviewable in one read. When adding states
 * or asset classes, follow the same nesting depth.
 * ========================================================================= */

type StateBands = Partial<Record<RateBandState, UnitBands>>;
type UnitBands = Partial<Record<RateBandUnitBand, VintageBands>>;
type VintageBands = Partial<Record<RateBandVintageBand, RateBand>>;
type AssetClassBands = Partial<Record<RateBandAssetClass, StateBands>>;

const PLACEHOLDER = "placeholder";

export const RATE_BANDS: AssetClassBands = {
  multifamily: {
    CA: {
      "1-4": {
        pre_1970:   { low: 0.55, mid: 0.80, high: 1.20, source: PLACEHOLDER },
        "1970_1999":{ low: 0.45, mid: 0.65, high: 0.95, source: PLACEHOLDER },
        "2000_plus":{ low: 0.35, mid: 0.50, high: 0.75, source: PLACEHOLDER },
      },
      "5-49": {
        pre_1970:   { low: 0.50, mid: 0.75, high: 1.15, source: PLACEHOLDER },
        "1970_1999":{ low: 0.40, mid: 0.60, high: 0.90, source: PLACEHOLDER },
        "2000_plus":{ low: 0.30, mid: 0.45, high: 0.70, source: PLACEHOLDER },
      },
      "50-149": {
        pre_1970:   { low: 0.45, mid: 0.65, high: 1.00, source: PLACEHOLDER },
        "1970_1999":{ low: 0.35, mid: 0.55, high: 0.80, source: PLACEHOLDER },
        "2000_plus":{ low: 0.28, mid: 0.40, high: 0.60, source: PLACEHOLDER },
      },
      "150+": {
        pre_1970:   { low: 0.40, mid: 0.60, high: 0.90, source: PLACEHOLDER },
        "1970_1999":{ low: 0.32, mid: 0.48, high: 0.75, source: PLACEHOLDER },
        "2000_plus":{ low: 0.25, mid: 0.38, high: 0.55, source: PLACEHOLDER },
      },
    },
    AZ: {
      "1-4": {
        pre_1970:   { low: 0.50, mid: 0.72, high: 1.05, source: PLACEHOLDER },
        "1970_1999":{ low: 0.42, mid: 0.60, high: 0.85, source: PLACEHOLDER },
        "2000_plus":{ low: 0.32, mid: 0.45, high: 0.65, source: PLACEHOLDER },
      },
      "5-49": {
        pre_1970:   { low: 0.45, mid: 0.65, high: 0.95, source: PLACEHOLDER },
        "1970_1999":{ low: 0.36, mid: 0.52, high: 0.78, source: PLACEHOLDER },
        "2000_plus":{ low: 0.28, mid: 0.40, high: 0.58, source: PLACEHOLDER },
      },
      "50-149": {
        pre_1970:   { low: 0.40, mid: 0.58, high: 0.85, source: PLACEHOLDER },
        "1970_1999":{ low: 0.32, mid: 0.46, high: 0.68, source: PLACEHOLDER },
        "2000_plus":{ low: 0.25, mid: 0.36, high: 0.52, source: PLACEHOLDER },
      },
      "150+": {
        pre_1970:   { low: 0.36, mid: 0.52, high: 0.78, source: PLACEHOLDER },
        "1970_1999":{ low: 0.28, mid: 0.42, high: 0.62, source: PLACEHOLDER },
        "2000_plus":{ low: 0.22, mid: 0.32, high: 0.48, source: PLACEHOLDER },
      },
    },
    NV: {
      "1-4": {
        pre_1970:   { low: 0.55, mid: 0.78, high: 1.15, source: PLACEHOLDER },
        "1970_1999":{ low: 0.44, mid: 0.62, high: 0.92, source: PLACEHOLDER },
        "2000_plus":{ low: 0.34, mid: 0.48, high: 0.70, source: PLACEHOLDER },
      },
      "5-49": {
        pre_1970:   { low: 0.48, mid: 0.70, high: 1.05, source: PLACEHOLDER },
        "1970_1999":{ low: 0.38, mid: 0.56, high: 0.82, source: PLACEHOLDER },
        "2000_plus":{ low: 0.30, mid: 0.42, high: 0.62, source: PLACEHOLDER },
      },
      "50-149": {
        pre_1970:   { low: 0.42, mid: 0.62, high: 0.92, source: PLACEHOLDER },
        "1970_1999":{ low: 0.34, mid: 0.50, high: 0.72, source: PLACEHOLDER },
        "2000_plus":{ low: 0.26, mid: 0.38, high: 0.56, source: PLACEHOLDER },
      },
      "150+": {
        pre_1970:   { low: 0.38, mid: 0.56, high: 0.85, source: PLACEHOLDER },
        "1970_1999":{ low: 0.30, mid: 0.44, high: 0.66, source: PLACEHOLDER },
        "2000_plus":{ low: 0.24, mid: 0.34, high: 0.50, source: PLACEHOLDER },
      },
    },
  },
  // Other asset classes — empty for now. The composer below returns
  // null when the lookup misses, so the chat falls through to "ask the
  // user for the missing facts" rather than fabricating a range.
};

/* =========================================================================
 * Band resolution
 * ========================================================================= */

/** Returns the unit-count bucket. Hard-coded thresholds match the
 *  table's keys. unit_count === 0 or unknown returns null — we don't
 *  guess a band when the input is missing. */
export function resolveUnitBand(units: number | undefined): RateBandUnitBand | null {
  if (typeof units !== "number" || !Number.isFinite(units) || units < 1) return null;
  if (units <= 4) return "1-4";
  if (units <= 49) return "5-49";
  if (units <= 149) return "50-149";
  return "150+";
}

/** Returns the vintage bucket. year_built unknown returns null. Year
 *  thresholds mirror typical underwriting cut-points — pre-1970 frames
 *  are a distinct risk class, and 2000+ marks the start of modern
 *  code adoption in CA. */
export function resolveVintageBand(year_built: number | undefined): RateBandVintageBand | null {
  if (typeof year_built !== "number" || !Number.isFinite(year_built)) return null;
  if (year_built < 1970) return "pre_1970";
  if (year_built < 2000) return "1970_1999";
  return "2000_plus";
}

/** Normalizes a free-text state into the two-letter codes the table
 *  uses. "California" / "ca" / "Calif." → "CA". Unknown → null. */
export function normalizeState(state: string | undefined): RateBandState | null {
  if (!state) return null;
  const s = state.trim().toUpperCase();
  if (s === "CA" || s === "CALIF" || s === "CALIF." || s === "CALIFORNIA") return "CA";
  if (s === "AZ" || s === "ARIZ" || s === "ARIZ." || s === "ARIZONA") return "AZ";
  if (s === "NV" || s === "NEV" || s === "NEV." || s === "NEVADA") return "NV";
  return null;
}

/** Resolves the rate band for a given context. Returns null when any
 *  required input is missing or when the table doesn't carry an entry
 *  for the resolved keys. The chat MUST treat null as "I don't have
 *  enough data to share a range — keep gathering intake." */
export function selectRateBand(context: RateBandContext): RateBand | null {
  if (!context.asset_class || context.asset_class === "unknown") return null;
  const stateCode = normalizeState(context.state);
  if (!stateCode) return null;
  const unitBand = resolveUnitBand(context.unit_count);
  if (!unitBand) return null;
  const vintageBand = resolveVintageBand(context.year_built);
  if (!vintageBand) return null;

  const byAsset = RATE_BANDS[context.asset_class];
  if (!byAsset) return null;
  const byState = byAsset[stateCode];
  if (!byState) return null;
  const byUnit = byState[unitBand];
  if (!byUnit) return null;
  return byUnit[vintageBand] ?? null;
}

/* =========================================================================
 * System-prompt slice composer
 *
 * Returns the dynamic block that lands after the cache breakpoint in
 * the intake system prompt. Three states:
 *
 *   1. No context yet (no asset class / state inferred) — returns a
 *      short reminder that pricing indications are gated on having
 *      asset class + state + units + vintage in hand.
 *
 *   2. Partial context — same as (1) but lists which fields are still
 *      missing. The chat keeps gathering intake.
 *
 *   3. Full context with a hit — returns the indication range, framed
 *      so the model surfaces it in plain English with the disclaimer
 *      appended by the route.
 *
 *   4. Full context with NO hit (e.g. asset class outside the seeded
 *      multifamily table) — returns a "no banded indication available
 *      for this combination — handoff to specialist" instruction.
 *
 * Keep this text shorter than the stable prompt so the cache hit rate
 * on the breakpoint above stays meaningful — the dynamic slice should
 * be a few hundred tokens at most.
 * ========================================================================= */

export function buildRateBandSlice(context: RateBandContext): string {
  const lines: string[] = [];
  lines.push("RATE-BAND INDICATION SLICE — dynamic context for the current turn.");
  lines.push("");

  const stateCode = normalizeState(context.state);
  const unitBand = resolveUnitBand(context.unit_count);
  const vintageBand = resolveVintageBand(context.year_built);
  const hasAssetClass = !!context.asset_class && context.asset_class !== "unknown";

  // Inventory of what's known so the model can be precise about the
  // gating. The chat uses this to phrase the next question rather than
  // re-asking captured fields.
  const known: string[] = [];
  const missing: string[] = [];
  if (hasAssetClass) known.push(`asset class: ${context.asset_class}`);
  else missing.push("asset class");
  if (stateCode) known.push(`state: ${stateCode}`);
  else missing.push("state");
  if (unitBand) known.push(`unit band: ${unitBand} (${context.unit_count} units)`);
  else missing.push("unit count");
  if (vintageBand) known.push(`vintage band: ${vintageBand} (built ${context.year_built})`);
  else missing.push("year built");

  if (known.length > 0) {
    lines.push(`Known so far: ${known.join("; ")}.`);
  }
  if (missing.length > 0) {
    lines.push(`Still needed for a banded indication: ${missing.join(", ")}.`);
  }

  const band = selectRateBand(context);

  if (band) {
    lines.push("");
    lines.push(`Indication band for this combination: ${formatBand(band)}.`);
    lines.push(
      "When the prospect asks about pricing, you MAY share this range in plain English (e.g. \"indications for buildings like yours are running 0.45–0.95 per $100 of insured value\"). Frame it as a market-level range, never as a quote. The system will append the standard disclaimers to your response — do NOT paste the disclaimer into your reply yourself.",
    );
    lines.push(
      "If the prospect pushes for a specific number or asks to bind, fire the rate-quote handoff: indications are not quotes, and a licensed specialist must run the actual numbers.",
    );
    return lines.join("\n");
  }

  // Full context but no hit. Distinguish "asset class unsupported" from
  // "state unsupported" so the chat phrases the handoff correctly.
  if (hasAssetClass && stateCode && unitBand && vintageBand) {
    lines.push("");
    lines.push(
      "No banded indication available for this asset class / state combination. Do NOT improvise a range. Finish the intake, then hand off to a specialist for a custom indication.",
    );
    return lines.join("\n");
  }

  lines.push("");
  lines.push(
    "Not enough context yet to share a banded indication. Keep gathering intake; do NOT cite a price range, even loosely, until all four fields above are known.",
  );
  return lines.join("\n");
}

/** Formats a band as "0.45 – 0.95 per $100 (mid ~0.65)" for the slice. */
export function formatBand(band: RateBand): string {
  return `${band.low.toFixed(2)} – ${band.high.toFixed(2)} per $100 of insured value (mid ~${band.mid.toFixed(2)})`;
}
