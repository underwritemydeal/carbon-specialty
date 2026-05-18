import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchCACounty, normalizeCountyFeature } from "./fetch-ca-county";
import { LA_COUNTY, findCACounty } from "./ca-county-registry";

/**
 * Tests for the CA county-direct fetch layer introduced in
 * C.S.1.7.0a. Covers both the field-mapping normalizer (against a
 * realistic LA County record) and the lookup-by-county-name router.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function arcgisResponse(attributes: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ features: [{ attributes }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function arcgisEmpty() {
  return new Response(
    JSON.stringify({ features: [] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const LB_PINE_LAT = 33.7822575;
const LB_PINE_LON = -118.1925638;

const LA_FULL_RECORD: Record<string, unknown> = {
  APN: "7273-004-008",
  SitusFullAddress: "125 W 12TH ST LONG BEACH CA 90813",
  UseCode: "0500",
  UseDescription: "Five or more apartments",
  UseType: "Residential",
  YearBuilt1: "1953",
  Units1: 10,
  SQFTmain1: 7564,
  Bedrooms1: 12,
  Bathrooms1: 10,
  DesignType1: "0500",
  QualityClass1: "C",
  Roll_LandValue: 83785,
  Roll_ImpValue: 351349,
  Roll_HomeOwnersExemp: 0,
  Shape__Area: 9583.0,
};

describe("findCACounty", () => {
  it("matches LA County by exact name", () => {
    expect(findCACounty("Los Angeles County")?.slug).toBe("la-county");
  });

  it("matches LA County by name without the 'County' suffix (some sources omit it)", () => {
    expect(findCACounty("Los Angeles")?.slug).toBe("la-county");
  });

  it("returns null for unknown counties (San Francisco not yet in registry)", () => {
    expect(findCACounty("San Francisco County")).toBeNull();
  });

  it("returns null for empty / undefined input", () => {
    expect(findCACounty(undefined)).toBeNull();
    expect(findCACounty("")).toBeNull();
  });
});

describe("normalizeCountyFeature — LA County full record", () => {
  it("extracts the full grouped + flat shape from a realistic record", () => {
    const out = normalizeCountyFeature(LA_FULL_RECORD, LA_COUNTY);
    // source tag
    expect(out.source_tag).toBe("la-county");
    // Building group
    expect(out.building?.use_code).toBe("0500");
    expect(out.building?.use_desc).toBe("Five or more apartments");
    expect(out.building?.year_built).toBe(1953);
    expect(out.building?.units).toBe(10);
    expect(out.building?.building_sqft).toBe(7564);
    expect(out.building?.lot_sqft).toBe(9583);
    expect(out.building?.bedrooms).toBe(12);
    expect(out.building?.bathrooms).toBe(10);
    expect(out.building?.construction_type).toBe("0500 · quality C");
    // Owner group — LA exposes the homeowner-exemption indicator only,
    // not a name. exempt=0 → "non-occupant".
    expect(out.owner?.ownership_type).toBe("non-occupant");
    expect(out.owner?.name).toBeUndefined();
    expect(out.owner?.mailing_address).toBeUndefined();
    // Transaction group — assessed_value sums land + improvements
    expect(out.transaction?.assessed_value).toBe(83785 + 351349);
    expect(out.transaction?.tax_exempt).toBe(0);
    expect(out.transaction?.last_sale_date).toBeUndefined();
    // Parcel id
    expect(out.parcel_id).toBe("7273-004-008");
    // Flat-field flatten for backwards compat
    expect(out.year_built).toBe(1953);
    expect(out.square_feet).toBe(7564);
    expect(out.units).toBe(10);
    expect(out.lot_size_sqft).toBe(9583);
    expect(out.land_use_code).toBe("0500");
    expect(out.land_use_desc).toBe("Five or more apartments");
    expect(out.construction_type).toBe("0500 · quality C");
    // Owner of record stays undefined (LA doesn't publish)
    expect(out.owner_of_record).toBeUndefined();
  });

  it("flags owner-occupied when the homeowner exemption is non-zero", () => {
    const out = normalizeCountyFeature(
      { ...LA_FULL_RECORD, Roll_HomeOwnersExemp: 7000 },
      LA_COUNTY,
    );
    expect(out.owner?.ownership_type).toBe("homeowner-occupied");
    expect(out.transaction?.tax_exempt).toBe(7000);
  });

  it("handles partial records (missing optional fields don't crash)", () => {
    const sparse = {
      APN: "1234-005-002",
      SitusFullAddress: "100 Test St",
      UseCode: "0100",
      UseDescription: "Single Family Residence",
      // No YearBuilt1, no Units1, no Bedrooms1, no exemption — sparse parcel
    };
    const out = normalizeCountyFeature(sparse, LA_COUNTY);
    expect(out.parcel_id).toBe("1234-005-002");
    expect(out.land_use_code).toBe("0100");
    expect(out.land_use_desc).toBe("Single Family Residence");
    expect(out.year_built).toBeUndefined();
    expect(out.units).toBeUndefined();
    expect(out.transaction?.assessed_value).toBeUndefined();
  });

  it("drops nonsense numeric values (year out of range, zero units, blank strings)", () => {
    const garbage = {
      APN: "1234-005-002",
      UseCode: "0100",
      YearBuilt1: "999", // out of range
      Units1: 0,
      SQFTmain1: 0,
      DesignType1: "   ", // blank after trim
      Roll_LandValue: 0,
      Roll_ImpValue: 0,
    };
    const out = normalizeCountyFeature(garbage, LA_COUNTY);
    expect(out.year_built).toBeUndefined();
    expect(out.units).toBeUndefined();
    expect(out.square_feet).toBeUndefined();
    expect(out.construction_type).toBeUndefined();
    expect(out.transaction?.assessed_value).toBeUndefined();
  });
});

describe("fetchCACounty", () => {
  it("returns null without calling ArcGIS when the county isn't in the registry (SF)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const out = await fetchCACounty(37.7749, -122.4194, "San Francisco County");
    expect(out).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null without calling ArcGIS when no county is provided", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const out = await fetchCACounty(33.78, -118.19, undefined);
    expect(out).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("queries the LA FeatureServer with the right geometry params + returns the normalized record", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(arcgisResponse(LA_FULL_RECORD));
    vi.stubGlobal("fetch", fetchSpy);

    const out = await fetchCACounty(LB_PINE_LAT, LB_PINE_LON, "Los Angeles County");

    // The URL hit the LA Parcels layer with the correct lat/lon
    const callUrl = fetchSpy.mock.calls[0][0] as string;
    expect(callUrl).toContain("services3.arcgis.com");
    expect(callUrl).toContain("LA_County_Parcels/FeatureServer/0/query");
    const decoded = decodeURIComponent(callUrl);
    expect(decoded).toContain(`"x":${LB_PINE_LON}`);
    expect(decoded).toContain(`"y":${LB_PINE_LAT}`);
    expect(decoded).toContain("distance=50"); // LA's defaultRadiusMeters

    // Normalized output landed
    expect(out?.parcel_id).toBe("7273-004-008");
    expect(out?.year_built).toBe(1953);
    expect(out?.land_use_desc).toBe("Five or more apartments");
  });

  it("returns null when ArcGIS returns zero features (no parcel near the geocoded point)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(arcgisEmpty()));
    const out = await fetchCACounty(33.78, -118.19, "Los Angeles County");
    expect(out).toBeNull();
  });

  it("returns null when the ArcGIS layer is unreachable (non-200)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream down", { status: 502 })),
    );
    const out = await fetchCACounty(33.78, -118.19, "Los Angeles County");
    expect(out).toBeNull();
  });
});
