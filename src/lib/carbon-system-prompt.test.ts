import { describe, expect, it } from "vitest";
import {
  buildIntakeSystemBlocks,
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

describe("CARBON_INTAKE_SYSTEM_PROMPT — HARD HANDOFF TRIGGERS (C.S.1.7.0j → C.S.1.7.0k)", () => {
  it("includes the HARD HANDOFF TRIGGERS heading", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("HARD HANDOFF TRIGGERS");
  });

  it("declares FIVE triggers (count language pinned for C.S.1.7.0k)", () => {
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

  it("documents trigger #5 — out-of-appetite asset class (C.S.1.7.0k addition)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Out-of-appetite asset class");
    // Example fingerprints — these are the canonical out-of-appetite classes
    // the brokerage will not write in-house.
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

describe("CARBON_INTAKE_SYSTEM_PROMPT — 10-field sequence ORDERING (C.S.1.7.0k)", () => {
  /** Pin the exact field order. The brief says "in order" — fields
   *  must appear in the prompt sequentially so the model walks them
   *  in the same order a brokerage would. */
  it("emits the ten field headers in the documented 1→10 order with no skips", () => {
    const headers = [
      "1. ADDRESS",
      "2. ASSET CLASS",
      "3. COVERAGE SCOPE",
      "4. EARTHQUAKE EXPOSURE & INTEREST",
      "5. FLOOD EXPOSURE & INTEREST",
      "6. LOSS HISTORY",
      "7. EFFECTIVE DATE",
      "8. CURRENT CARRIER + EXPIRING PREMIUM",
      "9. CONTACT",
      "10. CONSENT TO SHARE WITH MARKETS",
    ];
    let lastIdx = -1;
    for (const h of headers) {
      const idx = CARBON_INTAKE_SYSTEM_PROMPT.indexOf(h);
      expect(idx, `header missing or out of order: ${h}`).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it("instructs the model that the sequence is NOT arbitrary (load-bearing order)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("The sequence is not arbitrary");
  });

  it("explains why each leading field is positioned first (ADDRESS, ASSET CLASS, COVERAGE SCOPE)", () => {
    // The prompt names the reason each early field comes where it does
    // — ADDRESS first because enrich_property reduces work; ASSET CLASS
    // second because it gates the rate-band lookup; COVERAGE SCOPE
    // third because it gates carrier selection.
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("enrichment tool reduces the rest");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("gates the rate-band lookup");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("controls what carriers we approach");
  });

  it("preserves the never-re-ask rule", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Never re-ask a captured field");
  });

  it("requires ALL 10 fields + no handoff before wrap-up sentinel can fire", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain(
      "When ALL ten fields have been captured AND no handoff trigger has fired",
    );
  });
});

describe("CARBON_INTAKE_SYSTEM_PROMPT — PRICING + RATE-BAND wiring (C.S.1.7.0k)", () => {
  it("declares the PRICING LANGUAGE block pointing at the rate-band slice", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("PRICING LANGUAGE");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("RATE-BAND INDICATION SLICE");
  });

  it("tells the model the slice lands AFTER the cache breakpoint", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("after the cache breakpoint");
  });

  it("instructs the model NOT to paste disclaimer text itself (the route handles it)", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toMatch(/do NOT paste any disclaimer text/i);
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("system appends");
  });

  it("permits sharing an indication RANGE from the slice but forbids quoting a price", () => {
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("Never quote a price");
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("indication RANGE");
  });

  it("redirects out-of-appetite asks to the new handoff trigger (not the soft redirect)", () => {
    // The earlier prompt redirected non-CRE asks to "speak with a
    // generalist broker." C.S.1.7.0k unifies that under the
    // Out-of-appetite handoff trigger so it routes consistently.
    expect(CARBON_INTAKE_SYSTEM_PROMPT).toContain("fire the Out-of-appetite handoff trigger");
  });
});

describe("buildIntakeSystemBlocks — cache-friendly structure (C.S.1.7.0k)", () => {
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
    // The cache hit only fires if the stable block's text is byte-for-
    // byte identical across calls. Any per-conversation data must live
    // in the dynamic slice, never in the stable block.
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

  it("instructs handoff is ONLY present when a trigger fired (count updated to FIVE in C.S.1.7.0k)", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain(
      "ONLY present if one of the FIVE hard-handoff triggers fired",
    );
  });
});

describe("CARBON_EXTRACTION_SYSTEM_PROMPT — C.S.1.7.0k tool-use migration", () => {
  it("instructs the model to emit by calling the extract_intake tool exactly once", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("extract_intake tool exactly once");
  });

  it("includes out_of_appetite in the handoff reason union", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("out_of_appetite");
  });

  it("explicitly forbids free-text output (tool args are the contract)", () => {
    expect(CARBON_EXTRACTION_SYSTEM_PROMPT).toContain("Do not emit any free text");
  });
});

