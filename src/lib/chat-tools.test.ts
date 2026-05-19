import { describe, expect, it } from "vitest";
import {
  composeEnrichmentLines,
  EXTRACT_INTAKE_TOOL,
  EXTRACT_INTAKE_TOOL_NAME,
  EXTRACT_TOOLS,
  TOOLS,
} from "./chat-tools";
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

/* =========================================================================
 * C.S.1.7.0k — extract_intake tool definition
 *
 * Extract mode migrates from a free-text second LLM call to a forced
 * tool-use against this schema. The model's tool_use.input IS the
 * CarbonIntakePayload; no JSON parsing needed on the client.
 * ========================================================================= */

describe("EXTRACT_INTAKE_TOOL — C.S.1.7.0k schema", () => {
  it("registers under the canonical tool name 'extract_intake'", () => {
    expect(EXTRACT_INTAKE_TOOL.name).toBe(EXTRACT_INTAKE_TOOL_NAME);
    expect(EXTRACT_INTAKE_TOOL.name).toBe("extract_intake");
  });

  it("is NOT included in the intake-mode TOOLS catalog (separation of concerns)", () => {
    expect(TOOLS.find((t) => t.name === "extract_intake")).toBeUndefined();
  });

  it("IS included in the extract-mode EXTRACT_TOOLS catalog", () => {
    expect(EXTRACT_TOOLS).toHaveLength(1);
    expect(EXTRACT_TOOLS[0].name).toBe("extract_intake");
  });

  it("input_schema is an object with required asset_type + location + contact", () => {
    const schema = EXTRACT_INTAKE_TOOL.input_schema as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(expect.arrayContaining(["asset_type", "location", "contact"]));
  });

  it("asset_type enum carries all 7 asset classes + 'unknown' + 'condo_unit'", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const assetType = props.asset_type as { enum: string[] };
    expect(assetType.enum).toEqual(
      expect.arrayContaining([
        "multifamily",
        "mixed_use",
        "sfr_portfolio",
        "hoa",
        "condo_unit",
        "small_commercial_re",
        "builders_risk",
        "unknown",
      ]),
    );
  });

  it("coverage_scope enum mirrors CarbonIntakePayload's union", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const coverage = props.coverage_scope as { enum: string[] };
    expect(coverage.enum).toEqual(["property_only", "property_liability", "full_package", "unknown"]);
  });

  it("eq_interest + flood_interest enums mirror PerilInterest", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const expected = ["currently_carry", "looking_to_add", "not_interested", "unknown"];
    expect((props.eq_interest as { enum: string[] }).enum).toEqual(expected);
    expect((props.flood_interest as { enum: string[] }).enum).toEqual(expected);
  });

  it("handoff.reason includes all FIVE triggers (C.S.1.7.0k added out_of_appetite)", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const handoff = props.handoff as { properties: { reason: { enum: string[] } } };
    expect(handoff.properties.reason.enum).toEqual([
      "coverage_interpretation",
      "portfolio_tiv_over_10m",
      "active_loss",
      "litigation_pending",
      "out_of_appetite",
    ]);
  });

  it("contact.role union matches CarbonIntakePayload's contact.role", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const contact = props.contact as { properties: { role: { enum: string[] } } };
    expect(contact.properties.role.enum).toEqual([
      "owner",
      "asset_manager",
      "property_manager",
      "broker_referral",
      "other",
      "unknown",
    ]);
  });

  it("portfolio sub-object includes property_count and total_tiv_usd", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const portfolio = props.portfolio as { properties: Record<string, unknown>; required: string[] };
    expect(portfolio.properties).toHaveProperty("property_count");
    expect(portfolio.properties).toHaveProperty("total_tiv_usd");
    expect(portfolio.required).toContain("is_portfolio");
  });
});
