import { describe, expect, it } from "vitest";
import {
  buildIntakeSystemBlocks,
  CARBON_EXTRACTION_SYSTEM_PROMPT,
  CARBON_INTAKE_SYSTEM_PROMPT,
  INTAKE_WRAPUP_SENTINEL,
} from "./carbon-system-prompt";

/**
 * C.S.1.7.0g hallucination guardrail + C.S.1.7.0h typo-confirmation
 * language remain in the prompt. C.S.1.7.0k handoff trigger rules
 * remain unchanged per the C.S.1.7.1 brief.
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

  it("calls out non-determinism as a failure mode", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Same-input non-determinism");
  });

  it("directs the model to confirm when the formatted_address diverges from input", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("is that the property you meant?");
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

  it("explicitly exempts pure normalization from confirmation", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("pure normalization");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("do NOT require confirmation");
  });

  it("closes with 'when in doubt: confirm' to bias the model toward asking", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("When in doubt: confirm");
  });

  it("preserves the wrap-up sentinel for the client-side extraction trigger", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(INTAKE_WRAPUP_SENTINEL);
  });
});

/* =========================================================================
 * HARD HANDOFF TRIGGERS — preserved from C.S.1.7.0k (per the C.S.1.7.1
 * brief: "Existing handoff trigger tests stay unchanged").
 * ========================================================================= */

describe("CARBON_INTAKE_SYSTEM_PROMPT — HARD HANDOFF TRIGGERS", () => {
  it("includes the HARD HANDOFF TRIGGERS heading", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("HARD HANDOFF TRIGGERS");
  });

  it("declares FIVE triggers", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("FIVE situations");
  });

  it("instructs the model to STOP intake and NOT offer indications when a trigger fires", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("STOP the intake immediately");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("do NOT offer any indication");
  });

  it("documents trigger #1 — coverage interpretation with example phrasings", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Coverage interpretation");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Am I covered for water damage?");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Will you pay this claim?");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain('Phrasing tag: "coverage question"');
  });

  it("documents trigger #2 — Portfolio TIV above $10 million", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Portfolio TIV above $10 million");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("three or more properties");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain('Phrasing tag: "portfolio-scale account"');
  });

  it("documents trigger #3 — active loss in progress with example phrasings", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Active loss in progress");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("There's a fire right now");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("calling adjusters today");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain('Phrasing tag: "active-loss situation"');
  });

  it("documents trigger #4 — litigation pending with example phrasings", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Litigation pending");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("named as defendant");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("habitability claim");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain('Phrasing tag: "litigation matter"');
  });

  it("documents trigger #5 — out-of-appetite asset class", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Out-of-appetite asset class");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/personal\s+auto/);
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("cannabis");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("hospitality");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain('Phrasing tag: "out-of-appetite risk"');
  });

  it("routes each trigger to a distinct specialist destination", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/ROUTE TO: licensed coverage specialist/);
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/ROUTE TO: large-account/);
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/ROUTE TO: claims specialist/);
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/ROUTE TO: licensed specialist with E&O/);
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/ROUTE TO: external referral/);
  });

  it("provides the editorial handoff template with all FIVE placeholder phrases", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("licensed specialist should handle directly");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "[coverage question / portfolio-scale account / active-loss situation / litigation matter / out-of-appetite risk]",
    );
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Here's what I've captured so far");
  });

  it("declares the five routing destinations as non-interchangeable", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("not interchangeable");
  });

  it("forbids continuing the intake or emitting the wrap-up sentinel after handoff", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do NOT continue the intake sequence");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Do NOT emit the wrap-up sentinel");
  });

  it("forbids the robotic 'transferring to a human' phrasing", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain('do not say "transferring to a human"');
  });
});

describe("CARBON_INTAKE_SYSTEM_PROMPT — PORTFOLIO DETECTION", () => {
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

/* =========================================================================
 * C.S.1.7.1 — 8-turn habitational COPE intake sequence
 * ========================================================================= */

describe("CARBON_INTAKE_SYSTEM_PROMPT — 8-turn habitational COPE sequence (C.S.1.7.1)", () => {
  it("emits the eight turn headers in 1→8 order with no skips", () => {
    const headers = [
      "TURN 1 — ADDRESS",
      "TURN 2 — ENRICHMENT CONFIRMATION",
      "TURN 3 — ASSET CLASS CONFIRM",
      "TURN 4 — YEAR BUILT + SPRINKLERED",
      "TURN 5 — ELECTRICAL TYPE",
      "TURN 6 — ANNUAL RENTAL INCOME",
      "TURN 7 — LOSS HISTORY",
      "TURN 8 — NAMED INSURED + CONTACT + CONSENT",
    ];
    let lastIdx = -1;
    for (const h of headers) {
      const idx = CARBON_INTAKE_SYSTEM_PROMPT.indexOf(h);
      expect(idx, `header missing or out of order: ${h}`).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it("labels the sequence as the 8-turn habitational COPE flow", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("8-turn habitational COPE");
  });

  it("preserves the never-re-ask rule", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Never re-ask a captured field");
  });

  it("describes Turn 2 as a bulleted-list confirmation that flips enrichment_confirmed", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Pulling this up — looks like:");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "Correct me if anything's off, especially units, square footage, or year built.",
    );
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("sets enrichment_confirmed: true");
  });

  it("Turn 4 asks for sprinklered + central station alarm explicitly", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("sprinklered");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("central station fire alarm");
  });

  it("Turn 5 lists all 7 electrical_type options for prompt-mapping", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("standard breakers");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Federal Pacific Stab-Lok");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("knob-and-tube");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("aluminum branch");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("fuse box");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("mixed");
  });

  it("Turn 5 flags the three carrier-killer electrical signals as non-handoff", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("carrier-killer");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("this is NOT an out-of-appetite handoff");
  });

  it("Turn 6 marks expiring premium as a SOFT ask", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("SOFT ask");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Premium is optional");
  });

  it("Turn 7 EXPLICITLY forbids requesting loss runs at intake", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("DO NOT REQUEST LOSS RUNS AT INTAKE");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("self-reported");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("specialist gathers them post-handoff");
  });

  it("Turn 7 routes an active loss directly to the Active Loss handoff trigger", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("fire the Active Loss handoff trigger immediately");
  });

  it("Turn 8 separates named_insured (entity) from contact (human)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("entity on the dec page");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("human reaching out");
  });

  it("wrap-up only fires when all 8 turns complete AND no handoff fired", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "When all 8 turns are complete",
    );
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("no handoff trigger has fired");
  });

  it("forbids the wrap-up sentinel after a handoff trigger fired", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "Do not emit the wrap-up sentinel if a handoff trigger has fired",
    );
  });

  it("forbids asking the user about construction type (populated from enrich_property)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Never ask the user about construction type");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("construction is NEVER user-asked");
  });

  it("names the four habitational asset classes Carbon writes", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("apartment buildings (multifamily)");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("mixed-use");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("SFR portfolios");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("condo HOAs");
  });
});

/* =========================================================================
 * C.S.1.7.1 — Passive listener instructions
 * ========================================================================= */

describe("CARBON_INTAKE_SYSTEM_PROMPT — passive listeners (C.S.1.7.1)", () => {
  it("declares the PASSIVE LISTENERS section", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("PASSIVE LISTENERS");
  });

  it("documents flood_concern_volunteered with the trigger fingerprints", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("flood_concern_volunteered");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("flood, FEMA zone, water intrusion");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/Do NOT proactively ask about flood/);
  });

  it("documents property_mgmt_disclosed with the capture rule", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("property_mgmt_disclosed");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("third-party property manager");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/Do NOT proactively ask/);
  });

  it("explains why flood is passive-listener (excluded from standard property; post-handoff)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("excluded from the standard property form");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("post-handoff");
  });
});

/* =========================================================================
 * Pricing wiring + cache structure (preserved from C.S.1.7.0k)
 * ========================================================================= */

describe("CARBON_INTAKE_SYSTEM_PROMPT — PRICING + RATE-BAND wiring", () => {
  it("declares the PRICING LANGUAGE block pointing at the rate-band slice", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("PRICING LANGUAGE");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("RATE-BAND INDICATION SLICE");
  });

  it("tells the model the slice lands AFTER the cache breakpoint", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("after the cache breakpoint");
  });

  it("instructs the model NOT to paste disclaimer text itself", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/do NOT paste any disclaimer text/i);
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("system appends");
  });

  it("permits sharing an indication RANGE from the slice but forbids quoting a price", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Never quote a price");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("indication RANGE");
  });

  it("redirects out-of-appetite asks to the handoff trigger", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("fire the Out-of-appetite handoff trigger");
  });
});

describe("buildIntakeSystemBlocks — cache-friendly structure", () => {
  it("returns a two-block array: stable prompt + dynamic slice", () => {
    const blocks = buildIntakeSystemBlocks({});
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("text");
    expect(blocks[1].type).toBe("text");
  });

  it("stable block carries the ephemeral cache_control breakpoint", () => {
    const blocks = buildIntakeSystemBlocks({});
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("dynamic slice block does NOT carry a cache breakpoint", () => {
    const blocks = buildIntakeSystemBlocks({});
    expect(blocks[1].cache_control).toBeUndefined();
  });

  it("stable block content matches CARBON_INTAKE_SYSTEM_PROMPT exactly (cache-stability)", () => {
    const blocks = buildIntakeSystemBlocks({});
    expect(blocks[0].text).toBe(CARBON_INTAKE_SYSTEM_PROMPT);
  });

  it("stable block content is IDENTICAL across different rate-band contexts (cache-stability)", () => {
    const empty = buildIntakeSystemBlocks({});
    const withCA = buildIntakeSystemBlocks({
      asset_class: "multifamily",
      state: "CA",
      unit_count: 100,
      year_built: 2015,
    });
    const withAZ = buildIntakeSystemBlocks({
      asset_class: "multifamily",
      state: "AZ",
      unit_count: 50,
      year_built: 1985,
    });
    expect(withCA[0].text).toBe(empty[0].text);
    expect(withAZ[0].text).toBe(empty[0].text);
  });

  it("dynamic slice content VARIES with the rate-band context", () => {
    const empty = buildIntakeSystemBlocks({});
    const withFull = buildIntakeSystemBlocks({
      asset_class: "multifamily",
      state: "CA",
      unit_count: 100,
      year_built: 2015,
    });
    expect(withFull[1].text).not.toBe(empty[1].text);
    expect(withFull[1].text).toContain("Indication band for this combination");
  });
});

/* =========================================================================
 * Extraction prompt — C.S.1.7.1 schema documentation
 * ========================================================================= */

describe("CARBON_EXTRACTION_SYSTEM_PROMPT — C.S.1.7.1 habitational COPE schema", () => {
  it("instructs the model to emit by calling the extract_intake tool exactly once", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("extract_intake tool exactly once");
  });

  it("explicitly forbids free-text output", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("Do not emit any free text");
  });

  it("documents asset_class as 5-value habitational union (no condo_unit, no commercial)", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "'multifamily' | 'mixed_use' | 'sfr_portfolio' | 'hoa' | 'unknown'",
    );
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).not.toContain("'condo_unit'");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).not.toContain("'small_commercial_re'");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).not.toContain("'builders_risk'");
  });

  it("DOES NOT document coverage_scope / eq_interest / flood_interest (dropped)", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).not.toMatch(/coverage_scope/);
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).not.toMatch(/eq_interest/);
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).not.toMatch(/flood_interest/);
  });

  it("documents the new habitational COPE fields", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("square_footage");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("sprinklered");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("central_station_alarm");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("electrical_type");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("gross_annual_rents");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("expiring_premium_usd");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("loss_history_5yr");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("flood_concern_volunteered");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("property_mgmt_disclosed");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("named_insured");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("consent");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("enrichment_confirmed");
  });

  it("documents the 7-value electrical_type union", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("'standard_breakers'");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("'federal_pacific_stab_lok'");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("'knob_and_tube'");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("'aluminum_branch'");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("'fuse_box'");
  });

  it("documents loss_history_5yr as array of {year, type, approx_amount_usd}", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "Array<{ year: number; type: string; approx_amount_usd: number }>",
    );
  });

  it("instructs construction_type is populated from enrich_property, never user-asked", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "populated from enrich_property; never user-asked",
    );
  });

  it("instructs the model not to include loss-run data in loss_history_5yr", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("Do NOT include loss-run data");
  });

  it("documents handoff{reason} with all five trigger categories incl. out_of_appetite", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("coverage_interpretation");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("portfolio_tiv_over_10m");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("active_loss");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("litigation_pending");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("out_of_appetite");
  });

  it("instructs handoff is ONLY present when a trigger fired (FIVE)", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "ONLY present if one of the FIVE hard-handoff triggers fired",
    );
  });

  it("documents portfolio{property_count, total_tiv_usd}", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("property_count");
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("total_tiv_usd");
  });
});
