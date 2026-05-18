/**
 * Insurance-literate sanity check on county construction codes —
 * sprint C.S.1.7.0e.
 *
 * County assessor rolls can be decades stale for commercial
 * properties. The SF DataSF Tax Rolls dataset surfaced the canonical
 * case: 550 California Street (13 stories, downtown FiDi office)
 * codes "D" — Wood Frame — in the 2024 roll. That's a data error,
 * not actually wood frame; a Type-V wood-frame high-rise that tall
 * is essentially impossible under IBC building-code physics.
 *
 * Without this guard the chat would confidently surface "Wood Frame
 * (Type V)" for an obvious Type-I high-rise and any underwriter
 * reading the conversation would flag the broker as untrained.
 *
 * Rules (IBC building-code-derived):
 *
 *   1. stories >= 7 AND construction includes "Wood Frame"
 *      → suppress. CA podium-construction wood frame tops out at
 *        5-6 stories (5 over 1 concrete podium). 7+ stories of
 *        wood-frame Type V is essentially non-existent in built
 *        reality. CLT mass-timber projects in this range exist but
 *        would code as Heavy Timber / Type III/IV, not Wood Frame V.
 *
 *   2. stories >= 10 AND construction includes "Heavy Timber"
 *      → suppress. Type III (heavy timber / non-combustible
 *        exterior + heavy timber interior) caps at roughly 9
 *        stories even with modern mass-timber engineering. Above
 *        that, real construction is steel or concrete frame.
 *
 *   3. stories >= 12 AND construction is NOT one of
 *        "Fire-Resistive (Type I)" / "Steel Frame" (case-insensitive
 *        substring on either)
 *      → suppress. High-rises 12+ stories are virtually always
 *        Type I or Steel Frame in California; an assessor roll
 *        coding such a building as anything else is almost
 *        certainly stale/incorrect.
 *
 * When a rule fires:
 *   - building.construction_type → undefined
 *   - top-level (flat) construction_type → undefined
 *   - building.constructionTypeFlag → "unreliable_county_data"
 *
 * The chat surface (`src/lib/chat-tools.ts`) reads the flag and
 * substitutes a prompt asking the user for the actual construction
 * type rather than the bogus county string. Non-flagged facts pass
 * through unchanged.
 *
 * Operates in-place and returns the same reference for chaining.
 *
 * Scope: only applies where both `stories` and `construction_type`
 * are present. Realie's flat path doesn't carry stories, so the
 * check is effectively no-op there — that's fine; the SF case the
 * brief targets goes through `fetchCACounty`. If Realie ever exposes
 * stories, this check will start firing on Realie data too without
 * code changes (the input shape is generic).
 */

import type { BuildingFacts } from "./property-facts";

/** Minimal shape this check needs. Subset of both `PropertyFacts`
 *  and `CACountyFacts` so the function works generically without
 *  coupling to either return type. */
export interface ConstructionSanityInput {
  construction_type?: string;
  building?: BuildingFacts;
}

export function sanityCheckConstruction<T extends ConstructionSanityInput>(
  facts: T,
): T {
  const stories = facts.building?.stories;
  // Construction lives on the building section AND the flat field
  // (they mirror each other after normalization). Reading either
  // works; the suppression sets both to undefined regardless.
  const ct = facts.building?.construction_type ?? facts.construction_type;
  if (typeof stories !== "number" || !ct) return facts;

  if (!isConstructionImplausible(ct, stories)) return facts;

  // Flag + clear both representations so downstream consumers
  // (chat-tools.ts string composer, future marketing-export pipeline)
  // can't accidentally read the stale value.
  if (facts.building) {
    facts.building.construction_type = undefined;
    facts.building.constructionTypeFlag = "unreliable_county_data";
  } else {
    facts.building = { constructionTypeFlag: "unreliable_county_data" };
  }
  facts.construction_type = undefined;

  return facts;
}

/** Pure rule evaluator — exported so the sanity-check tests can
 *  exercise the rules directly without going through the
 *  in-place-mutation harness. */
export function isConstructionImplausible(
  constructionType: string,
  stories: number,
): boolean {
  const lower = constructionType.toLowerCase();

  // Rule 1 — tall wood frame
  if (stories >= 7 && lower.includes("wood frame")) return true;

  // Rule 2 — very tall heavy timber
  if (stories >= 10 && lower.includes("heavy timber")) return true;

  // Rule 3 — 12+ stories with a recognizable LOWER-type code is
  // implausible. Unrecognized raw codes (LA's "0500", county-internal
  // numerics, etc.) pass through — we can't call them wrong without
  // knowing what they mean. The substring list below covers every
  // value the registry's constructionTypeMaps emit that is NOT Type I
  // or Steel; if those start surfacing in tall buildings the data is
  // wrong.
  if (stories >= 12) {
    const lowerTypeMarkers = [
      "wood frame", // also Rule 1 at 7+
      "heavy timber", // also Rule 2 at 10+
      "type ii",
      "type iii",
      "type iv",
      "type v",
      "non-combustible",
      "unknown", // SF "Unknown (per assessor)" mapped from "NA"
    ];
    if (lowerTypeMarkers.some((m) => lower.includes(m))) return true;
  }

  return false;
}
