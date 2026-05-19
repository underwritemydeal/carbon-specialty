import { describe, expect, it } from "vitest";
import {
  CARBON_EXTRACTION_SYSTEM_PROMPT,
  CARBON_INTAKE_SYSTEM_PROMPT,
  INTAKE_WRAPUP_SENTINEL,
} from "./carbon-system-prompt";

/**
 * Tests for the C.S.1.7.0g hallucination guardrail language in the
 * intake system prompt. The brief targets a production failure mode
 * where the LLM invented property facts on input strings that didn't
 * resolve cleanly (typos, missing-coverage markets). These assertions
 * pin the prohibition language so it can't be silently softened or
 * removed in a future prompt rewrite.
 */

describe("CARBON_INTAKE_SYSTEM_PROMPT — hallucination guardrail", () => {
  it("includes the explicit prohibition heading", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("HALLUCINATION GUARDRAIL");
  });

  it("names the tool as the only source of truth for property facts", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "tool's output is the ONLY source of truth for property data",
    );
  });

  it("publishes the canonical no-records response verbatim", () => {
    // This exact string is what the model should emit when enrichment
    // returns nothing usable. A future prompt edit must not break this
    // wording without an intentional update — production probes match
    // against it.
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      `"I couldn't find records for that address — can you confirm the spelling, city, and state?"`,
    );
  });

  it("explicitly prohibits guessing and inventing facts", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do not guess");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do not infer");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do not produce plausible-sounding facts");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do not describe properties from training data");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "Do not fabricate addresses, cities, or property characteristics",
    );
  });

  it("calls out non-determinism as a failure mode (production bug fingerprint)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Same-input non-determinism");
  });

  it("directs the model to confirm when the formatted_address diverges from input", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "is that the property you meant?",
    );
  });
});

describe("CARBON_INTAKE_SYSTEM_PROMPT — C.S.1.7.0h typo-confirmation tightening", () => {
  it("names Google's silent typo correction as the failure mode being guarded", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("silently corrects typos");
  });

  it("references the production report fingerprint (Stanion → Stanyan)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Stanion");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Stanyan");
  });

  it("explicitly lists street-letters-changed as a confirmation trigger", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "The street name itself was modified",
    );
  });

  it("lists city/state/ZIP change as a confirmation trigger", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "The city, state, or ZIP was changed",
    );
  });

  it("lists street-number snap as a confirmation trigger", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "The street NUMBER was changed",
    );
  });

  it("requires confirmation BEFORE stating any other facts (not after)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(
      /MUST ask for confirmation BEFORE stating any other property facts/,
    );
  });

  it("explicitly exempts pure normalization (capitalization, suffix, ZIP additions) from confirmation", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("pure normalization");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "do NOT require confirmation",
    );
  });

  it("closes with 'when in doubt: confirm' to bias the model toward asking", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("When in doubt: confirm");
  });

  it("preserves the wrap-up sentinel for the client-side extraction trigger", () => {
    // Defensive: the hallucination guardrail block was inserted
    // upstream of the wrap-up section. Verify the sentinel is still
    // in the prompt and still matches the exported constant.
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(INTAKE_WRAPUP_SENTINEL);
  });
});

/* =========================================================================
 * C.S.1.7.0j — Structured 10-field intake + hard handoff triggers
 * =========================================================================
 *
 * The intake stops being free-form Q&A and becomes a structured
 * brokerage flow with four explicit handoff escalations. These tests
 * pin the prompt language so the structure survives future prompt
 * edits — the brokerage behavior is load-bearing.
 *
 * Assertions are string-match on the rendered prompt content (we can't
 * deterministically test model runtime behavior in vitest). Production
 * probes verify the runtime behavior end-to-end.
 * ========================================================================= */

describe("CARBON_INTAKE_SYSTEM_PROMPT — HARD HANDOFF TRIGGERS (C.S.1.7.0j)", () => {
  it("includes the HARD HANDOFF TRIGGERS heading", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("HARD HANDOFF TRIGGERS");
  });

  it("instructs the model to STOP intake and NOT offer indications when a trigger fires", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("STOP the intake immediately");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("do NOT offer any indication");
  });

  it("documents trigger #1 — coverage interpretation with example phrasings", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Coverage interpretation");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Am I covered for water damage?");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Will you pay this claim?");
  });

  it("documents trigger #2 — Portfolio TIV above $10 million", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Portfolio TIV above $10 million");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("three or more properties");
  });

  it("documents trigger #3 — active loss in progress with example phrasings", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Active loss in progress");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("There's a fire right now");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("calling adjusters today");
  });

  it("documents trigger #4 — litigation pending with example phrasings", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Litigation pending");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("named as defendant");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("habitability claim");
  });

  it("provides the editorial handoff template with the placeholder phrases", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("licensed specialist should handle directly");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "[coverage question / portfolio-scale account / active-loss situation / litigation matter]",
    );
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Here's what I've captured so far");
  });

  it("forbids continuing the intake or emitting the wrap-up sentinel after handoff", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do NOT continue the intake sequence");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do NOT emit the wrap-up sentinel");
  });

  it("forbids the robotic 'transferring to a human' phrasing", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain('do not say "transferring to a human"');
  });
});

describe("CARBON_INTAKE_SYSTEM_PROMPT — PORTFOLIO DETECTION (C.S.1.7.0j)", () => {
  it("includes the PORTFOLIO DETECTION heading", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("PORTFOLIO DETECTION");
  });

  it("lists portfolio-language signals", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("across our 12");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("scattered-site");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("syndicators");
  });

  it("provides the TIV qualifier question verbatim", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "How many properties total, and roughly what's the combined replacement value across the schedule?",
    );
  });

  it("instructs the model to math TIV from per-property numbers", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("do the math if they give per-property numbers");
  });

  it("specifies $10M as the handoff threshold", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("≥ $10M");
  });
});

describe("CARBON_INTAKE_SYSTEM_PROMPT — 10-FIELD INTAKE SEQUENCE (C.S.1.7.0j)", () => {
  it("includes the INTAKE SEQUENCE heading + 10-field framing", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("INTAKE SEQUENCE — 10 fields");
  });

  it("names all 10 fields with their numbered labels", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("1. ADDRESS");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("2. ASSET CLASS");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("3. COVERAGE SCOPE");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("4. EARTHQUAKE EXPOSURE & INTEREST");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("5. FLOOD EXPOSURE & INTEREST");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("6. LOSS HISTORY");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("7. EFFECTIVE DATE");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("8. CURRENT CARRIER + EXPIRING PREMIUM");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("9. CONTACT");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("10. CONSENT TO SHARE WITH MARKETS");
  });

  it("includes coverage scope options (property only / property+liability / full package)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Property only");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Property + liability");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Full package");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("EPLI");
  });

  it("explains EQ context (excluded from standard property; DIC or standalone)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("EQ is excluded from standard property policies");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("DIC");
  });

  it("explains flood context (excluded from standard property; NFIP or private)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Flood is excluded from standard property policies");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("NFIP");
  });

  it("directs the model to fire Active Loss handoff if loss history reveals one", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "fire the Active Loss handoff trigger immediately",
    );
  });

  it("requires all 10 fields captured AND no handoff fired before emitting wrap-up", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "When ALL ten fields have been captured AND no handoff trigger has fired",
    );
  });

  it("forbids the wrap-up sentinel after a handoff trigger fired", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "Do not emit the wrap-up sentinel if a handoff trigger has fired",
    );
  });

  it("supports out-of-order field capture (never re-ask)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Never re-ask a captured field");
  });

  it("includes condo_unit asset class option (matches CarbonIntakePayload.asset_type)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("single condo unit");
  });
});

describe("CARBON_EXTRACTION_SYSTEM_PROMPT — C.S.1.7.0j schema additions", () => {
  it("documents the coverage_scope union", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "'property_only' | 'property_liability' | 'full_package'",
    );
  });

  it("documents EQ + flood interest unions", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "'currently_carry' | 'looking_to_add' | 'not_interested'",
    );
  });

  it("documents handoff{reason} with all 4 trigger categories", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("coverage_interpretation");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("portfolio_tiv_over_10m");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("active_loss");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("litigation_pending");
  });

  it("documents portfolio{property_count,total_tiv_usd}", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("property_count");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("total_tiv_usd");
  });

  it("documents contact.role union", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "'owner' | 'asset_manager' | 'property_manager' | 'broker_referral'",
    );
  });

  it("includes condo_unit in asset_type union (matches intake prompt + payload)", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("'condo_unit'");
  });

  it("documents effective_date + expiring_premium extraction rules", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("effective_date");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("expiring_premium");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("$18,500");
  });

  it("documents consent_to_share_with_markets boolean", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("consent_to_share_with_markets");
  });

  it("instructs handoff is ONLY present when a trigger fired", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "ONLY present if one of the four hard-handoff triggers fired",
    );
  });
});

