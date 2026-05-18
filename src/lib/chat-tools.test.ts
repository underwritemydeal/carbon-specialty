import { describe, expect, it } from "vitest";
import { composeEnrichmentLines } from "./chat-tools";
import type { PropertyFacts } from "./property-facts";

/**
 * Tests for the C.S.1.7.0i condo-unit disambiguation hint in the
 * chat-tools enrichment-line composer.
 *
 * Production report (operator on mobile):
 *   2708 Holmes St, Kansas City MO — Realie returned a single condo
 *   unit's record (1158 sqft, 2br/2ba, useCode 1004 →
 *   "Condominium Unit"). The actual building is a 6-unit apartment.
 *   The chat surfaced "condo" as the property type without flagging
 *   the unit-level data structure to the user.
 *
 * The composer now appends a Note: line when land_use_desc matches
 * /condominium/i, directing the chat to ask the user whether they're
 * insuring the single unit or the whole multi-unit building.
 */

function baseFacts(overrides: Partial<PropertyFacts> = {}): PropertyFacts {
  return {
    query_address: "test",
    canonical_address: "100 Test St, Test City, ZZ 00000, USA",
    sources_succeeded: ["geocoding"],
    sources_failed: [],
    ...overrides,
  };
}

describe("composeEnrichmentLines — C.S.1.7.0i condo disambiguation", () => {
  it("appends the condo-unit Note when land_use_desc is 'Condominium Unit' (Realie 1004 case)", () => {
    const lines = composeEnrichmentLines(
      baseFacts({
        land_use_desc: "Condominium Unit",
        land_use_code: "1004",
        year_built: 1920,
        square_feet: 1158,
      }),
    );
    const noteLine = lines.find((l) => l.startsWith("Note:"));
    expect(noteLine).toBeDefined();
    expect(noteLine).toContain("single condominium unit");
    expect(noteLine).toContain("multi-unit building");
    expect(noteLine).toContain("are you insuring this one unit, or the whole multi-unit building");
  });

  it("matches 'Condominium' case-insensitively (e.g. 'condominium' from a different source casing)", () => {
    const lines = composeEnrichmentLines(
      baseFacts({ land_use_desc: "condominium" }),
    );
    expect(lines.some((l) => l.startsWith("Note:"))).toBe(true);
  });

  it("does NOT append the Note for Multi-Family Residential (correct multi-unit classification)", () => {
    const lines = composeEnrichmentLines(
      baseFacts({
        land_use_desc: "Multi-Family Residential",
        units: 18,
        year_built: 1962,
        square_feet: 11970,
      }),
    );
    expect(lines.some((l) => l.startsWith("Note:"))).toBe(false);
  });

  it("does NOT append the Note for Single Family Residential", () => {
    const lines = composeEnrichmentLines(
      baseFacts({ land_use_desc: "Single Family Residential", units: 1 }),
    );
    expect(lines.some((l) => l.startsWith("Note:"))).toBe(false);
  });

  it("does NOT append the Note for Commercial Office", () => {
    const lines = composeEnrichmentLines(
      baseFacts({ land_use_desc: "Commercial Office" }),
    );
    expect(lines.some((l) => l.startsWith("Note:"))).toBe(false);
  });

  it("preserves existing line ordering — Note appears after the facts, before sources_failed", () => {
    const lines = composeEnrichmentLines(
      baseFacts({
        land_use_desc: "Condominium Unit",
        units: 1,
        year_built: 1920,
        square_feet: 1158,
        parcel_id: "TEST-001",
        sources_failed: ["realie"],
      }),
    );
    const noteIdx = lines.findIndex((l) => l.startsWith("Note:"));
    const parcelIdx = lines.findIndex((l) => l.startsWith("Parcel ID:"));
    const sourcesIdx = lines.findIndex((l) =>
      l.startsWith("Sources that did not return"),
    );
    expect(noteIdx).toBeGreaterThan(parcelIdx);
    expect(noteIdx).toBeLessThan(sourcesIdx);
  });
});

describe("composeEnrichmentLines — pre-existing C.S.1.6/7 behaviors preserved", () => {
  it("emits canonical address as the first line", () => {
    const lines = composeEnrichmentLines(baseFacts({}));
    expect(lines[0]).toContain("Address (canonical):");
  });

  it("includes land use with code when both are present", () => {
    const lines = composeEnrichmentLines(
      baseFacts({ land_use_desc: "Apartments", land_use_code: "210" }),
    );
    expect(lines.some((l) => l === "Land use: Apartments (code 210)")).toBe(true);
  });

  it("substitutes the construction-unreliable line when flag is set (C.S.1.7.0e)", () => {
    const lines = composeEnrichmentLines(
      baseFacts({
        building: { stories: 13, constructionTypeFlag: "unreliable_county_data" },
      }),
    );
    const line = lines.find((l) => l.startsWith("Construction:"));
    expect(line).toContain("county records flagged unreliable");
  });

  it("omits Construction line when neither construction_type nor flag is set", () => {
    const lines = composeEnrichmentLines(baseFacts({}));
    expect(lines.some((l) => l.startsWith("Construction:"))).toBe(false);
  });
});
