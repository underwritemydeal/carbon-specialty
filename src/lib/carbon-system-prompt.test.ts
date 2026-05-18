import { describe, expect, it } from "vitest";
import {
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
