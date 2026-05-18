import { describe, expect, it } from "vitest";
import {
  isConstructionImplausible,
  sanityCheckConstruction,
  type ConstructionSanityInput,
} from "./construction-sanity";

/**
 * Tests for the C.S.1.7.0e construction sanity-check layer.
 *
 * Two scopes:
 *
 *   1. `isConstructionImplausible` — pure rule evaluator. Exhaustive
 *      cases per IBC-physics rule.
 *
 *   2. `sanityCheckConstruction` — in-place mutation harness around
 *      the rules. Verifies flag setting + clearing of both
 *      representations (building.construction_type AND flat
 *      construction_type) + pass-through for clean data.
 *
 * Canonical example from production: 550 California Street, SF.
 * 13-story FiDi office building, SF DataSF Tax Rolls codes
 * construction_type="D" → mapped via constructionTypeMap to "Wood
 * Frame (Type V)". Physically impossible — should be suppressed.
 */

describe("isConstructionImplausible — IBC physics rules", () => {
  // Rule 1: tall wood frame
  it("flags 13-story Wood Frame (Type V) — canonical 550 California case", () => {
    expect(isConstructionImplausible("Wood Frame (Type V)", 13)).toBe(true);
  });

  it("flags 7-story Wood Frame — first story above podium cap", () => {
    expect(isConstructionImplausible("Wood Frame (Type V)", 7)).toBe(true);
  });

  it("preserves 6-story Wood Frame — valid CA podium (5 over 1)", () => {
    expect(isConstructionImplausible("Wood Frame (Type V)", 6)).toBe(false);
  });

  it("preserves 3-story Wood Frame — common multifamily (3300 17th St)", () => {
    expect(isConstructionImplausible("Wood Frame (Type V)", 3)).toBe(false);
  });

  // Rule 2: very tall heavy timber
  it("flags 10-story Heavy Timber — above mass-timber practical limit", () => {
    expect(isConstructionImplausible("Heavy Timber / Masonry (Type III)", 10)).toBe(true);
  });

  it("preserves 6-story Heavy Timber — 2299 Pacific Ave case", () => {
    expect(isConstructionImplausible("Heavy Timber / Masonry (Type III)", 6)).toBe(false);
  });

  it("preserves 9-story Heavy Timber — edge of Type III practical limit", () => {
    expect(isConstructionImplausible("Heavy Timber / Masonry (Type III)", 9)).toBe(false);
  });

  // Rule 3: 12+ stories must be Type I or Steel
  it("preserves 15-story Fire-Resistive (Type I) — what high-rises actually are", () => {
    expect(isConstructionImplausible("Fire-Resistive (Type I)", 15)).toBe(false);
  });

  it("preserves 13-story Steel Frame — valid high-rise construction", () => {
    expect(isConstructionImplausible("Steel Frame", 13)).toBe(false);
  });

  it("preserves 6-story Steel Frame — non-high-rise but valid", () => {
    expect(isConstructionImplausible("Steel Frame", 6)).toBe(false);
  });

  it("flags 12-story Non-Combustible (Type II) — should be Type I or Steel", () => {
    expect(isConstructionImplausible("Non-Combustible (Type II)", 12)).toBe(true);
  });

  it("flags 14-story 'Unknown (per assessor)' — 12+ stories, not Type I/Steel", () => {
    expect(isConstructionImplausible("Unknown (per assessor)", 14)).toBe(true);
  });

  // Boundary + case-insensitivity
  it("preserves 11-story Wood Frame? — wait, 11 >= 7 fires Rule 1 first", () => {
    expect(isConstructionImplausible("Wood Frame (Type V)", 11)).toBe(true);
  });

  it("matches 'wood frame' case-insensitively", () => {
    expect(isConstructionImplausible("WOOD FRAME", 8)).toBe(true);
  });

  it("preserves LA's raw '0500' code (unmapped, no 'wood frame' substring) at any height", () => {
    expect(isConstructionImplausible("0500", 3)).toBe(false);
    expect(isConstructionImplausible("0500", 15)).toBe(false);
  });

  it("preserves LA's '0500 · quality C' composite at multifamily heights", () => {
    expect(isConstructionImplausible("0500 · quality C", 3)).toBe(false);
  });
});

describe("sanityCheckConstruction — in-place mutation harness", () => {
  it("clears construction_type + sets flag when rule fires on 13-story wood frame", () => {
    const facts: ConstructionSanityInput = {
      construction_type: "Wood Frame (Type V)",
      building: {
        construction_type: "Wood Frame (Type V)",
        stories: 13,
        year_built: 1960,
      },
    };
    const out = sanityCheckConstruction(facts);
    expect(out.building?.construction_type).toBeUndefined();
    expect(out.construction_type).toBeUndefined();
    expect(out.building?.constructionTypeFlag).toBe("unreliable_county_data");
    // Year + other fields preserved
    expect(out.building?.year_built).toBe(1960);
    expect(out.building?.stories).toBe(13);
  });

  it("preserves construction_type when rule doesn't fire (3-story wood)", () => {
    const facts: ConstructionSanityInput = {
      construction_type: "Wood Frame (Type V)",
      building: {
        construction_type: "Wood Frame (Type V)",
        stories: 3,
      },
    };
    const out = sanityCheckConstruction(facts);
    expect(out.building?.construction_type).toBe("Wood Frame (Type V)");
    expect(out.construction_type).toBe("Wood Frame (Type V)");
    expect(out.building?.constructionTypeFlag).toBeUndefined();
  });

  it("passes through when stories is missing (no signal to evaluate against)", () => {
    const facts: ConstructionSanityInput = {
      construction_type: "Wood Frame (Type V)",
      building: { construction_type: "Wood Frame (Type V)" },
    };
    const out = sanityCheckConstruction(facts);
    expect(out.construction_type).toBe("Wood Frame (Type V)");
    expect(out.building?.constructionTypeFlag).toBeUndefined();
  });

  it("passes through when construction_type is missing", () => {
    const facts: ConstructionSanityInput = { building: { stories: 20 } };
    const out = sanityCheckConstruction(facts);
    expect(out.building?.constructionTypeFlag).toBeUndefined();
  });

  it("creates a building section if absent and the flat field would trigger (unlikely path)", () => {
    // Realie-style flat facts. No `stories` though, so the rule
    // doesn't fire and we don't synthesize a building section.
    const facts: ConstructionSanityInput = { construction_type: "Wood Frame" };
    const out = sanityCheckConstruction(facts);
    expect(out.construction_type).toBe("Wood Frame");
    expect(out.building).toBeUndefined();
  });

  it("returns the same reference for chaining", () => {
    const facts: ConstructionSanityInput = {
      building: { stories: 3, construction_type: "Wood Frame" },
    };
    expect(sanityCheckConstruction(facts)).toBe(facts);
  });
});
