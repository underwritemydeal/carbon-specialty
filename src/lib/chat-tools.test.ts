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
 * C.S.1.7.1 — extract_intake tool definition (habitational COPE schema)
 *
 * Extract mode runs as a forced tool-use against this schema. The
 * model's tool_use.input IS the CarbonIntakePayload; no JSON parsing
 * needed on the client. C.S.1.7.1 collapses the asset class enum,
 * drops coverage_scope / eq_interest / flood_interest, and adds the
 * full habitational COPE field set.
 * ========================================================================= */

describe("EXTRACT_INTAKE_TOOL — C.S.1.7.1 habitational COPE schema", () => {
  it("registers under the canonical tool name 'extract_intake'", () => {
    expect(EXTRACT_INTAKE_TOOL.name).toBe(EXTRACT_INTAKE_TOOL_NAME);
    expect(EXTRACT_INTAKE_TOOL.name).toBe("extract_intake");
  });

  it("is NOT included in the intake-mode TOOLS catalog", () => {
    expect(TOOLS.find((t) => t.name === "extract_intake")).toBeUndefined();
  });

  it("IS included in the extract-mode EXTRACT_TOOLS catalog", () => {
    expect(EXTRACT_TOOLS).toHaveLength(1);
    expect(EXTRACT_TOOLS[0].name).toBe("extract_intake");
  });

  it("required fields: asset_class, contact, enrichment_confirmed", () => {
    const schema = EXTRACT_INTAKE_TOOL.input_schema as Record<string, unknown>;
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(
      expect.arrayContaining(["asset_class", "contact", "enrichment_confirmed"]),
    );
  });

  it("asset_class enum is the 5-value habitational union (no condo_unit/commercial/builders_risk)", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const assetClass = props.asset_class as { enum: string[] };
    expect(assetClass.enum).toEqual(["multifamily", "mixed_use", "sfr_portfolio", "hoa", "unknown"]);
    expect(assetClass.enum).not.toContain("condo_unit");
    expect(assetClass.enum).not.toContain("small_commercial_re");
    expect(assetClass.enum).not.toContain("builders_risk");
  });

  it("electrical_type enum carries all 7 service-type values", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const electrical = props.electrical_type as { enum: string[] };
    expect(electrical.enum).toEqual([
      "standard_breakers",
      "federal_pacific_stab_lok",
      "knob_and_tube",
      "aluminum_branch",
      "fuse_box",
      "mixed",
      "unknown",
    ]);
  });

  it("DROPPED fields are no longer present in the schema (C.S.1.7.1 removal)", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    expect(props).not.toHaveProperty("coverage_scope");
    expect(props).not.toHaveProperty("eq_interest");
    expect(props).not.toHaveProperty("flood_interest");
    expect(props).not.toHaveProperty("eq_exposure");
    expect(props).not.toHaveProperty("flood_exposure");
    expect(props).not.toHaveProperty("asset_type"); // renamed to asset_class
    expect(props).not.toHaveProperty("location");
    expect(props).not.toHaveProperty("consent_to_share_with_markets"); // renamed to consent
    expect(props).not.toHaveProperty("current_expiration");
    expect(props).not.toHaveProperty("expiring_premium"); // renamed to expiring_premium_usd
    expect(props).not.toHaveProperty("loss_history_summary"); // replaced by loss_history_5yr
  });

  it("NEW habitational COPE fields are present in the schema", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    expect(props).toHaveProperty("asset_class");
    expect(props).toHaveProperty("unit_count");
    expect(props).toHaveProperty("square_footage");
    expect(props).toHaveProperty("year_built");
    expect(props).toHaveProperty("sprinklered");
    expect(props).toHaveProperty("central_station_alarm");
    expect(props).toHaveProperty("electrical_type");
    expect(props).toHaveProperty("gross_annual_rents");
    expect(props).toHaveProperty("effective_date");
    expect(props).toHaveProperty("current_carrier");
    expect(props).toHaveProperty("expiring_premium_usd");
    expect(props).toHaveProperty("loss_history_5yr");
    expect(props).toHaveProperty("flood_concern_volunteered");
    expect(props).toHaveProperty("property_mgmt_disclosed");
    expect(props).toHaveProperty("construction_type");
    expect(props).toHaveProperty("named_insured");
    expect(props).toHaveProperty("contact");
    expect(props).toHaveProperty("consent");
    expect(props).toHaveProperty("enrichment_confirmed");
  });

  it("field TYPE shapes match C.S.1.7.1 spec", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    expect((props.unit_count as { type: string }).type).toBe("number");
    expect((props.square_footage as { type: string }).type).toBe("number");
    expect((props.year_built as { type: string }).type).toBe("number");
    expect((props.gross_annual_rents as { type: string }).type).toBe("number");
    expect((props.sprinklered as { type: string }).type).toBe("boolean");
    expect((props.central_station_alarm as { type: string }).type).toBe("boolean");
    expect((props.consent as { type: string }).type).toBe("boolean");
    expect((props.enrichment_confirmed as { type: string }).type).toBe("boolean");
    expect((props.flood_concern_volunteered as { type: string }).type).toBe("boolean");
    expect((props.named_insured as { type: string }).type).toBe("string");
    expect((props.effective_date as { type: string }).type).toBe("string");
    expect((props.loss_history_5yr as { type: string }).type).toBe("array");
  });

  it("loss_history_5yr items shape: { year, type, approx_amount_usd } all required", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const lossHistory = props.loss_history_5yr as {
      items: { type: string; properties: Record<string, unknown>; required: string[] };
    };
    expect(lossHistory.items.type).toBe("object");
    expect(lossHistory.items.properties).toHaveProperty("year");
    expect(lossHistory.items.properties).toHaveProperty("type");
    expect(lossHistory.items.properties).toHaveProperty("approx_amount_usd");
    expect(lossHistory.items.required).toEqual(
      expect.arrayContaining(["year", "type", "approx_amount_usd"]),
    );
  });

  it("contact sub-object has name, role, email, phone (no preferred_method)", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const contact = props.contact as { properties: Record<string, unknown> };
    expect(contact.properties).toHaveProperty("name");
    expect(contact.properties).toHaveProperty("role");
    expect(contact.properties).toHaveProperty("email");
    expect(contact.properties).toHaveProperty("phone");
    expect(contact.properties).not.toHaveProperty("preferred_method");
  });

  it("handoff.reason includes all FIVE triggers (preserved from C.S.1.7.0k)", () => {
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

  it("portfolio sub-object includes property_count and total_tiv_usd", () => {
    const props = (EXTRACT_INTAKE_TOOL.input_schema as { properties: Record<string, unknown> }).properties;
    const portfolio = props.portfolio as { properties: Record<string, unknown>; required: string[] };
    expect(portfolio.properties).toHaveProperty("property_count");
    expect(portfolio.properties).toHaveProperty("total_tiv_usd");
    expect(portfolio.required).toContain("is_portfolio");
  });
});
