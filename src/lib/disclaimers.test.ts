import { describe, expect, it } from "vitest";
import {
  appendDisclaimers,
  detectDisclaimers,
  disclaimerFor,
  DISCLAIMER_COVERAGE_SCOPE,
  DISCLAIMER_DATA_SOURCE,
  DISCLAIMER_INDICATION,
  LOCKED_DISCLAIMERS,
} from "./disclaimers";

/**
 * C.S.1.7.0k locked disclaimers + post-stream concatenation.
 *
 * The route appends these to the model's reply when pricing /
 * coverage-scope / data-source language is detected. The strings
 * themselves are LOCKED — changes to wording need a compliance
 * sign-off. These tests pin both the strings and the detection
 * heuristics so a future prompt edit can't silently weaken them.
 */

describe("disclaimers — locked strings", () => {
  it("exports the indication disclaimer with the exact compliance wording", () => {
    expect(DISCLAIMER_INDICATION).toContain("Indication ranges are market-level estimates, not quotes");
    expect(DISCLAIMER_INDICATION).toContain("Carbon Specialty Insurance is a licensed brokerage");
    expect(DISCLAIMER_INDICATION).toContain("nothing here binds coverage");
  });

  it("exports the coverage-scope disclaimer", () => {
    expect(DISCLAIMER_COVERAGE_SCOPE).toContain("Coverage descriptions here are general");
    expect(DISCLAIMER_COVERAGE_SCOPE).toContain("the policy controls in every case");
  });

  it("exports the data-source disclaimer", () => {
    expect(DISCLAIMER_DATA_SOURCE).toContain("public county and parcel records");
    expect(DISCLAIMER_DATA_SOURCE).toContain("may be outdated or incomplete");
  });

  it("LOCKED_DISCLAIMERS is a 3-tuple in canonical order (indication, coverage, data-source)", () => {
    expect(LOCKED_DISCLAIMERS).toEqual([
      DISCLAIMER_INDICATION,
      DISCLAIMER_COVERAGE_SCOPE,
      DISCLAIMER_DATA_SOURCE,
    ]);
  });

  it("disclaimerFor maps kind to the exact locked string", () => {
    expect(disclaimerFor("indication")).toBe(DISCLAIMER_INDICATION);
    expect(disclaimerFor("coverage_scope")).toBe(DISCLAIMER_COVERAGE_SCOPE);
    expect(disclaimerFor("data_source")).toBe(DISCLAIMER_DATA_SOURCE);
  });
});

describe("disclaimers — detectDisclaimers (pricing-language detection)", () => {
  // Indication detection
  it("flags 'indication' as needing the indication disclaimer", () => {
    expect(detectDisclaimers("Indications for buildings like yours are running 0.45 to 0.95 per $100"))
      .toContain("indication");
  });

  it("flags any dollar amount as needing the indication disclaimer", () => {
    expect(detectDisclaimers("Expect somewhere around $18,500 annual")).toContain("indication");
  });

  it("flags 'premium' as needing the indication disclaimer", () => {
    expect(detectDisclaimers("expiring premium is what we'll need to beat")).toContain("indication");
  });

  it("flags 'rate' as needing the indication disclaimer", () => {
    expect(detectDisclaimers("rates are firming up in this market")).toContain("indication");
  });

  it("flags 'per $100' rate-per-hundred phrasing", () => {
    expect(detectDisclaimers("Carriers are landing around 0.65 per $100 of TIV")).toContain("indication");
  });

  it("flags 'quote' as needing the indication disclaimer", () => {
    expect(detectDisclaimers("we'll come back with a quote")).toContain("indication");
  });

  it("does NOT flag clean intake text with no pricing language", () => {
    expect(detectDisclaimers("Got it — what's the unit count?")).toEqual([]);
  });

  // Coverage-scope detection
  it("flags 'property only' coverage discussion", () => {
    expect(detectDisclaimers("Property only — building hazard insurance, no liability"))
      .toContain("coverage_scope");
  });

  it("flags 'full package' coverage discussion", () => {
    expect(detectDisclaimers("Looking at a full package — EPLI, D&O if HOA, umbrella"))
      .toContain("coverage_scope");
  });

  it("flags 'does the policy cover' language as coverage_scope", () => {
    expect(detectDisclaimers("Does the policy cover slip-and-fall?")).toContain("coverage_scope");
  });

  it("flags 'is X covered' language as coverage_scope", () => {
    expect(detectDisclaimers("Is water damage covered under the standard form?"))
      .toContain("coverage_scope");
  });

  // Data-source detection
  it("flags 'records show' as needing the data-source disclaimer", () => {
    expect(detectDisclaimers("Records show this is a 6-unit building")).toContain("data_source");
  });

  it("flags 'built in YYYY' as needing the data-source disclaimer", () => {
    expect(detectDisclaimers("I see 1247 Pine Ave is built in 1962")).toContain("data_source");
  });

  it("flags 'square feet' / 'square footage' / 'sq ft' as data_source", () => {
    expect(detectDisclaimers("11,970 square feet on a 0.27 acre lot")).toContain("data_source");
    expect(detectDisclaimers("around 12,000 sq ft total")).toContain("data_source");
  });

  it("flags 'parcel id' / 'owner of record' as data_source", () => {
    expect(detectDisclaimers("Parcel ID 1234-005-001")).toContain("data_source");
    expect(detectDisclaimers("Owner of record: ACME Holdings LLC")).toContain("data_source");
  });

  // Multi-fire
  it("returns multiple kinds when multiple categories appear in the same text", () => {
    const kinds = detectDisclaimers(
      "Records show 50 units built in 1968. Indication is 0.65 per $100. Property + liability scope.",
    );
    expect(kinds).toContain("indication");
    expect(kinds).toContain("coverage_scope");
    expect(kinds).toContain("data_source");
  });

  it("returns kinds in canonical order (indication, coverage_scope, data_source)", () => {
    const kinds = detectDisclaimers(
      "Records show 50 units built in 1968. Indication is 0.65 per $100. Property + liability scope.",
    );
    expect(kinds).toEqual(["indication", "coverage_scope", "data_source"]);
  });

  it("returns empty array on empty input (no spurious fires)", () => {
    expect(detectDisclaimers("")).toEqual([]);
  });
});

describe("disclaimers — appendDisclaimers (post-stream concat)", () => {
  it("appends the indication disclaimer when pricing language is present", () => {
    const { text, applied } = appendDisclaimers(
      "Indications for buildings like yours are running 0.45 to 0.95 per $100 of insured value.",
    );
    expect(applied).toEqual(["indication"]);
    expect(text).toContain(DISCLAIMER_INDICATION);
  });

  it("does NOT modify text when no triggering language is present", () => {
    const original = "Got it — what's the unit count?";
    const { text, applied } = appendDisclaimers(original);
    expect(text).toBe(original);
    expect(applied).toEqual([]);
  });

  it("appends ALL triggered disclaimers in canonical order", () => {
    const input =
      "Records show 50 units built in 1968. Indication is 0.65 per $100. Property + liability scope.";
    const { text, applied } = appendDisclaimers(input);
    expect(applied).toEqual(["indication", "coverage_scope", "data_source"]);
    // Order: indication line comes before coverage_scope which comes before data_source
    const idxInd = text.indexOf(DISCLAIMER_INDICATION);
    const idxCov = text.indexOf(DISCLAIMER_COVERAGE_SCOPE);
    const idxSrc = text.indexOf(DISCLAIMER_DATA_SOURCE);
    expect(idxInd).toBeGreaterThan(-1);
    expect(idxCov).toBeGreaterThan(idxInd);
    expect(idxSrc).toBeGreaterThan(idxCov);
  });

  it("separates disclaimers from the body with a paragraph break + em-dash", () => {
    const { text } = appendDisclaimers("Indication is 0.65 per $100.");
    expect(text).toMatch(/\n\n— Indication ranges are market-level estimates/);
  });

  it("is idempotent — running twice does NOT double-append", () => {
    const first = appendDisclaimers("Indication is 0.65 per $100.");
    const second = appendDisclaimers(first.text);
    expect(second.applied).toEqual([]);
    expect(second.text).toBe(first.text);
  });

  it("dedupes a disclaimer the model already pasted verbatim", () => {
    // Defense in depth: if the model accidentally repeats the locked
    // string in its reply, the appender skips it rather than doubling.
    const inputWithDisclaimer =
      "Indication is 0.65 per $100. " + DISCLAIMER_INDICATION;
    const { text, applied } = appendDisclaimers(inputWithDisclaimer);
    expect(applied).toEqual([]); // skip — disclaimer is already present
    expect(text).toBe(inputWithDisclaimer);
  });

  it("INVARIANT — every response that mentions pricing language carries the indication disclaimer", () => {
    // The compliance rule: pricing-language → indication disclaimer.
    // Sample fingerprints exercise the patterns the model is most
    // likely to emit when consulting the rate-band slice.
    const fingerprints = [
      "Indications for buildings like yours are running 0.45 to 0.95 per $100",
      "Expect somewhere around $18,500 annual premium",
      "Rates on this kind of building are landing around 0.65",
      "A 50-unit garden building might quote around $90,000",
      "Premium will depend on loss runs — we typically see 0.40 to 0.80 per $100",
    ];
    for (const fp of fingerprints) {
      const { text, applied } = appendDisclaimers(fp);
      expect(applied).toContain("indication");
      expect(text).toContain(DISCLAIMER_INDICATION);
    }
  });
});
