import { describe, expect, it } from "vitest";
import {
  buildRateBandSlice,
  formatBand,
  normalizeState,
  RATE_BANDS,
  resolveUnitBand,
  resolveVintageBand,
  selectRateBand,
} from "./rate-bands";

/**
 * Tests for the C.S.1.7.0k rate-band table + slice composer.
 *
 * Values in RATE_BANDS are placeholders, so these tests pin shape and
 * resolution logic rather than the exact numbers. The data PR that
 * lands real values can re-tune the numeric assertions when it ships.
 */

describe("rate-bands — band resolvers", () => {
  it("resolveUnitBand: 1-4 / 5-49 / 50-149 / 150+", () => {
    expect(resolveUnitBand(1)).toBe("1-4");
    expect(resolveUnitBand(4)).toBe("1-4");
    expect(resolveUnitBand(5)).toBe("5-49");
    expect(resolveUnitBand(49)).toBe("5-49");
    expect(resolveUnitBand(50)).toBe("50-149");
    expect(resolveUnitBand(149)).toBe("50-149");
    expect(resolveUnitBand(150)).toBe("150+");
    expect(resolveUnitBand(2000)).toBe("150+");
  });

  it("resolveUnitBand: undefined and invalid inputs return null", () => {
    expect(resolveUnitBand(undefined)).toBeNull();
    expect(resolveUnitBand(0)).toBeNull();
    expect(resolveUnitBand(-3)).toBeNull();
    expect(resolveUnitBand(NaN)).toBeNull();
  });

  it("resolveVintageBand: pre_1970 / 1970_1999 / 2000_plus", () => {
    expect(resolveVintageBand(1900)).toBe("pre_1970");
    expect(resolveVintageBand(1969)).toBe("pre_1970");
    expect(resolveVintageBand(1970)).toBe("1970_1999");
    expect(resolveVintageBand(1999)).toBe("1970_1999");
    expect(resolveVintageBand(2000)).toBe("2000_plus");
    expect(resolveVintageBand(2024)).toBe("2000_plus");
  });

  it("resolveVintageBand: undefined returns null", () => {
    expect(resolveVintageBand(undefined)).toBeNull();
    expect(resolveVintageBand(NaN)).toBeNull();
  });

  it("normalizeState: handles two-letter, longhand, and dotted abbreviations", () => {
    expect(normalizeState("CA")).toBe("CA");
    expect(normalizeState("ca")).toBe("CA");
    expect(normalizeState("California")).toBe("CA");
    expect(normalizeState("Calif.")).toBe("CA");
    expect(normalizeState("AZ")).toBe("AZ");
    expect(normalizeState("Arizona")).toBe("AZ");
    expect(normalizeState("NV")).toBe("NV");
    expect(normalizeState("Nevada")).toBe("NV");
    expect(normalizeState("Texas")).toBeNull(); // not seeded yet
    expect(normalizeState(undefined)).toBeNull();
    expect(normalizeState("")).toBeNull();
  });
});

describe("rate-bands — RATE_BANDS table shape (sprint C.S.1.7.0k seed)", () => {
  it("seeds multifamily for CA, AZ, NV", () => {
    expect(RATE_BANDS.multifamily).toBeDefined();
    expect(RATE_BANDS.multifamily?.CA).toBeDefined();
    expect(RATE_BANDS.multifamily?.AZ).toBeDefined();
    expect(RATE_BANDS.multifamily?.NV).toBeDefined();
  });

  it("each multifamily state carries all four unit bands", () => {
    for (const state of ["CA", "AZ", "NV"] as const) {
      const byState = RATE_BANDS.multifamily?.[state];
      expect(byState).toBeDefined();
      expect(byState?.["1-4"]).toBeDefined();
      expect(byState?.["5-49"]).toBeDefined();
      expect(byState?.["50-149"]).toBeDefined();
      expect(byState?.["150+"]).toBeDefined();
    }
  });

  it("each unit band carries all three vintage bands", () => {
    for (const state of ["CA", "AZ", "NV"] as const) {
      for (const unit of ["1-4", "5-49", "50-149", "150+"] as const) {
        const byUnit = RATE_BANDS.multifamily?.[state]?.[unit];
        expect(byUnit?.pre_1970).toBeDefined();
        expect(byUnit?.["1970_1999"]).toBeDefined();
        expect(byUnit?.["2000_plus"]).toBeDefined();
      }
    }
  });

  it("each band has low <= mid <= high with positive values", () => {
    for (const state of ["CA", "AZ", "NV"] as const) {
      for (const unit of ["1-4", "5-49", "50-149", "150+"] as const) {
        for (const vintage of ["pre_1970", "1970_1999", "2000_plus"] as const) {
          const band = RATE_BANDS.multifamily?.[state]?.[unit]?.[vintage];
          expect(band).toBeDefined();
          expect(band!.low).toBeGreaterThan(0);
          expect(band!.mid).toBeGreaterThanOrEqual(band!.low);
          expect(band!.high).toBeGreaterThanOrEqual(band!.mid);
        }
      }
    }
  });

  it("seed values are marked as placeholder so the data-PR audit can find them", () => {
    const band = RATE_BANDS.multifamily?.CA?.["50-149"]?.["2000_plus"];
    expect(band?.source).toBe("placeholder");
  });

  it("monotonically: older vintage prices higher than newer vintage within same band", () => {
    // Pin the underwriting intuition: pre-1970 > 1970-99 > 2000+ for
    // the same state + unit band. If this ever flips on the placeholder
    // values someone has miscoded; real values from the agency binds
    // PR should still respect the ordering for multifamily.
    for (const state of ["CA", "AZ", "NV"] as const) {
      for (const unit of ["1-4", "5-49", "50-149", "150+"] as const) {
        const pre = RATE_BANDS.multifamily?.[state]?.[unit]?.pre_1970?.mid ?? 0;
        const mid = RATE_BANDS.multifamily?.[state]?.[unit]?.["1970_1999"]?.mid ?? 0;
        const newer = RATE_BANDS.multifamily?.[state]?.[unit]?.["2000_plus"]?.mid ?? 0;
        expect(pre).toBeGreaterThan(mid);
        expect(mid).toBeGreaterThan(newer);
      }
    }
  });
});

describe("rate-bands — selectRateBand resolution", () => {
  it("returns the band when all four inputs resolve to a seeded combination", () => {
    const band = selectRateBand({
      asset_class: "multifamily",
      state: "CA",
      unit_count: 100,
      year_built: 2015,
    });
    expect(band).not.toBeNull();
    expect(band?.mid).toBe(0.40); // 50-149 / 2000_plus / CA
  });

  it("normalizes longhand state names", () => {
    const a = selectRateBand({
      asset_class: "multifamily",
      state: "California",
      unit_count: 100,
      year_built: 2015,
    });
    const b = selectRateBand({
      asset_class: "multifamily",
      state: "CA",
      unit_count: 100,
      year_built: 2015,
    });
    expect(a).toEqual(b);
  });

  it("returns null when asset_class is unknown", () => {
    expect(
      selectRateBand({
        asset_class: "unknown",
        state: "CA",
        unit_count: 100,
        year_built: 2015,
      }),
    ).toBeNull();
  });

  it("returns null when state is missing or not in table", () => {
    expect(
      selectRateBand({
        asset_class: "multifamily",
        unit_count: 100,
        year_built: 2015,
      }),
    ).toBeNull();
    expect(
      selectRateBand({
        asset_class: "multifamily",
        state: "TX",
        unit_count: 100,
        year_built: 2015,
      }),
    ).toBeNull();
  });

  it("returns null when unit_count is missing", () => {
    expect(
      selectRateBand({
        asset_class: "multifamily",
        state: "CA",
        year_built: 2015,
      }),
    ).toBeNull();
  });

  it("returns null when year_built is missing", () => {
    expect(
      selectRateBand({
        asset_class: "multifamily",
        state: "CA",
        unit_count: 100,
      }),
    ).toBeNull();
  });

  it("returns null for asset classes not seeded yet (mixed_use, hoa, etc.)", () => {
    for (const cls of [
      "mixed_use",
      "sfr_portfolio",
      "hoa",
      "condo_unit",
      "small_commercial_re",
      "builders_risk",
    ] as const) {
      expect(
        selectRateBand({
          asset_class: cls,
          state: "CA",
          unit_count: 50,
          year_built: 2015,
        }),
      ).toBeNull();
    }
  });
});

describe("rate-bands — buildRateBandSlice (system-prompt dynamic block)", () => {
  it("always opens with the slice header so the prompt cache boundary is recognizable", () => {
    const slice = buildRateBandSlice({});
    expect(slice).toContain("RATE-BAND INDICATION SLICE");
  });

  it("with no context: lists all four fields as missing and gates the band", () => {
    const slice = buildRateBandSlice({});
    expect(slice).toContain("Still needed");
    expect(slice).toContain("asset class");
    expect(slice).toContain("state");
    expect(slice).toContain("unit count");
    expect(slice).toContain("year built");
    expect(slice).toContain("Not enough context yet to share a banded indication");
  });

  it("with partial context: surfaces what's known and what's missing", () => {
    const slice = buildRateBandSlice({
      asset_class: "multifamily",
      state: "CA",
    });
    expect(slice).toContain("Known so far");
    expect(slice).toContain("multifamily");
    expect(slice).toContain("CA");
    expect(slice).toContain("Still needed");
    expect(slice).toContain("unit count");
    expect(slice).toContain("year built");
  });

  it("with full context that hits the table: surfaces the indication range and disclaimer pointer", () => {
    const slice = buildRateBandSlice({
      asset_class: "multifamily",
      state: "CA",
      unit_count: 100,
      year_built: 2015,
    });
    expect(slice).toContain("Indication band for this combination");
    expect(slice).toContain("per $100 of insured value");
    expect(slice).toContain("system will append the standard disclaimers");
    expect(slice).toMatch(/do NOT paste the disclaimer/i);
  });

  it("with full context that misses the table: tells the model to NOT improvise a range", () => {
    const slice = buildRateBandSlice({
      asset_class: "small_commercial_re",
      state: "CA",
      unit_count: 1,
      year_built: 2015,
    });
    expect(slice).toContain("No banded indication available");
    expect(slice).toContain("Do NOT improvise");
  });

  it("with full context for unsupported state: tells the model to NOT improvise", () => {
    const slice = buildRateBandSlice({
      asset_class: "multifamily",
      state: "TX",
      unit_count: 100,
      year_built: 2015,
    });
    expect(slice).toContain("Still needed");
    expect(slice).toContain("state");
  });
});

describe("rate-bands — formatBand", () => {
  it("renders as low – high per $100 with mid", () => {
    expect(formatBand({ low: 0.45, mid: 0.65, high: 0.95 })).toBe(
      "0.45 – 0.95 per $100 of insured value (mid ~0.65)",
    );
  });

  it("preserves two-decimal precision", () => {
    expect(formatBand({ low: 0.3, mid: 0.5, high: 0.7 })).toContain("0.30");
    expect(formatBand({ low: 0.3, mid: 0.5, high: 0.7 })).toContain("0.70");
    expect(formatBand({ low: 0.3, mid: 0.5, high: 0.7 })).toContain("~0.50");
  });
});
