import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchCACounty, normalizeCountyFeature } from "./fetch-ca-county";
import {
  LA_COUNTY,
  SAN_DIEGO_COUNTY,
  ORANGE_COUNTY,
  RIVERSIDE_COUNTY,
  findCACounty,
} from "./ca-county-registry";

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

  it("returns null for unknown counties (SF not yet in registry, SB explicitly skipped C.S.1.7.0b)", () => {
    expect(findCACounty("San Francisco County")).toBeNull();
    expect(findCACounty("San Bernardino County")).toBeNull();
  });

  it("returns null for empty / undefined input", () => {
    expect(findCACounty(undefined)).toBeNull();
    expect(findCACounty("")).toBeNull();
  });

  // C.S.1.7.0b — three new counties register correctly.
  it("matches San Diego County", () => {
    expect(findCACounty("San Diego County")?.slug).toBe("san-diego-county");
    expect(findCACounty("San Diego")?.slug).toBe("san-diego-county");
  });

  it("matches Orange County", () => {
    expect(findCACounty("Orange County")?.slug).toBe("orange-county");
  });

  it("matches Riverside County", () => {
    expect(findCACounty("Riverside County")?.slug).toBe("riverside-county");
    expect(findCACounty("Riverside")?.slug).toBe("riverside-county");
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

/* =========================================================================
 * Per-county normalizer tests (C.S.1.7.0b)
 * =========================================================================
 * One realistic record per county confirming the registry's field
 * mapping translates correctly through normalizeCountyFeature. The
 * records are shaped from actual live-probe responses captured
 * during sprint research.
 * ========================================================================= */

describe("normalizeCountyFeature — San Diego County", () => {
  it("extracts the building section from a downtown SD apartment record", () => {
    // Shaped from a live SANDAG query (415 E Broadway, San Diego)
    const sdRecord: Record<string, unknown> = {
      apn: "5335730100",
      nucleus_use_cd: "210", // mapped → "Apartments" in registry
      year_effective: "1985",
      total_lvg_area: 24807,
      SHAPE__Area: 7398.85,
      unitqty: 20,
      bedrooms: "000", // SD sentinel — should be dropped by readNumber + n > 0
      baths: "000",
      asr_total: 3342805,
      situs_street: "BROADWAY",
    };
    const out = normalizeCountyFeature(sdRecord, SAN_DIEGO_COUNTY);

    expect(out.source_tag).toBe("san-diego-county");
    expect(out.parcel_id).toBe("5335730100");
    expect(out.building?.use_code).toBe("210");
    expect(out.building?.use_desc).toBe("Apartments"); // from inline useCodeMap
    expect(out.building?.year_built).toBe(1985);
    expect(out.building?.building_sqft).toBe(24807);
    expect(out.building?.units).toBe(20);
    expect(out.building?.bedrooms).toBeUndefined(); // "000" sentinel filtered
    expect(out.building?.bathrooms).toBeUndefined();
    expect(out.building?.lot_sqft).toBe(7399);
    expect(out.transaction?.assessed_value).toBe(3342805);
    // Flat-field flatten
    expect(out.year_built).toBe(1985);
    expect(out.square_feet).toBe(24807);
    expect(out.units).toBe(20);
    expect(out.land_use_desc).toBe("Apartments");
  });

  it("falls through to 'Use code XXX' for unmapped SD nucleus codes", () => {
    const out = normalizeCountyFeature(
      { apn: "999", nucleus_use_cd: "999" },
      SAN_DIEGO_COUNTY,
    );
    expect(out.building?.use_code).toBe("999");
    expect(out.building?.use_desc).toBeUndefined();
    // Note: the LA-style inline map doesn't have 999, so use_desc stays
    // undefined. The fall-through "Use code XXX" string is only produced
    // by the Realie normalizer, not the county-direct normalizer. This
    // is intentional — county-direct prefers honesty over guessing.
  });

  it("treats SD year_effective='00' sentinel as undefined", () => {
    const out = normalizeCountyFeature(
      { apn: "5", year_effective: "00" },
      SAN_DIEGO_COUNTY,
    );
    expect(out.building?.year_built).toBeUndefined();
  });
});

describe("normalizeCountyFeature — Orange County", () => {
  it("extracts the building + mailing sections from a downtown Santa Ana record", () => {
    // Shaped from a live OC LegalLotsAttributeOpenData query (104 E 1st St,
    // Santa Ana). OC publishes mailing address (rare for CA).
    const ocRecord: Record<string, unknown> = {
      AssessmentNo: "398-512-01",
      SiteAddress: "104 E 1ST ST",
      MailAddress: "104 E 1ST ST  SANTA ANA 92701-5311",
      LandVal: "583821", // string in source — coerce
      ImprovedVal: "708216",
      Shape__Area: 13787.12,
      GPLU_CODE: "C1",
      GPLU_DESC: "Commercial",
    };
    const out = normalizeCountyFeature(ocRecord, ORANGE_COUNTY);

    expect(out.source_tag).toBe("orange-county");
    expect(out.parcel_id).toBe("398-512-01");
    expect(out.building?.use_code).toBe("C1");
    expect(out.building?.use_desc).toBe("Commercial");
    expect(out.building?.lot_sqft).toBe(13787);
    // OC's useDescField wins → flat land_use_desc populated
    expect(out.land_use_desc).toBe("Commercial");
    // Owner: only mailing_address published, no name
    expect(out.owner?.mailing_address).toBe("104 E 1ST ST  SANTA ANA 92701-5311");
    expect(out.owner?.name).toBeUndefined();
    // Transaction: LandVal + ImprovedVal summed
    expect(out.transaction?.assessed_value).toBe(583821 + 708216);
  });

  it("handles thin OC records (lot only, no use code)", () => {
    const out = normalizeCountyFeature(
      { AssessmentNo: "111-222-33", Shape__Area: 5000 },
      ORANGE_COUNTY,
    );
    expect(out.parcel_id).toBe("111-222-33");
    expect(out.building?.lot_sqft).toBe(5000);
    expect(out.building?.use_code).toBeUndefined();
    expect(out.year_built).toBeUndefined(); // OC doesn't publish year_built on this layer
  });
});

describe("normalizeCountyFeature — Riverside County", () => {
  it("extracts the building + owner mailing + transaction sections from a CREST record", () => {
    // Shaped from a live Riverside PARCELS_CREST query (6570 Magnolia Ave).
    const rivRecord: Record<string, unknown> = {
      APN: "225124026",
      MAIL_STREET: "48570 SHADY VIEW DR",
      MAIL_CITY: "PALM DESERT CA 92260", // city+state+zip combined
      SITUS_STREET: "6570 MAGNOLIA AVE",
      CLASS_CODE: "Bank", // already human-readable, not a numeric code
      ACREAGE: 0.51,
      LAND: 757628.0,
      STRUCTURES: 4261668.0,
      "SHAPE.STArea()": 21491.65,
    };
    const out = normalizeCountyFeature(rivRecord, RIVERSIDE_COUNTY);

    expect(out.source_tag).toBe("riverside-county");
    expect(out.parcel_id).toBe("225124026");
    // CLASS_CODE → land_use_desc directly (no land_use_code field for
    // Riverside since the field is already a string description)
    expect(out.building?.use_desc).toBe("Bank");
    expect(out.building?.use_code).toBeUndefined();
    expect(out.land_use_desc).toBe("Bank");
    expect(out.land_use_code).toBeUndefined();
    // Lot sqft from polygon area
    expect(out.building?.lot_sqft).toBe(21492);
    expect(out.lot_size_sqft).toBe(21492);
    // Owner: mailing-only (first CA county to publish mailing)
    expect(out.owner?.mailing_address).toBe("48570 SHADY VIEW DR");
    expect(out.owner?.mailing_city).toBe("PALM DESERT CA 92260"); // combined string
    expect(out.owner?.name).toBeUndefined();
    // Transaction: LAND + STRUCTURES summed
    expect(out.transaction?.assessed_value).toBe(757628 + 4261668);
    // Year built / sqft / units stay undefined — those are in the joined
    // CREST_PROPERTY_CHAR table that this sprint doesn't query.
    expect(out.year_built).toBeUndefined();
    expect(out.square_feet).toBeUndefined();
    expect(out.units).toBeUndefined();
  });
});
