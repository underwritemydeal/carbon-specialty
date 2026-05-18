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
  EffectiveYear1: "1998", // C.S.1.7.0b USEFUL field — major rehab year
  Units1: 10,
  SQFTmain1: 7564,
  Bedrooms1: 12,
  Bathrooms1: 10,
  DesignType1: "0500",
  QualityClass1: "C",
  // Roll_LandValue / Roll_ImpValue / Roll_HomeOwnersExemp / Shape__Area
  // intentionally left in the test record — the registry no longer
  // reads them as of C.S.1.7.0b but the source still publishes them.
  // Test asserts these stay UNDEFINED in the normalized output.
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
  it("extracts the insurance-tuned grouped + flat shape from a realistic record", () => {
    const out = normalizeCountyFeature(LA_FULL_RECORD, LA_COUNTY);
    // source tag
    expect(out.source_tag).toBe("la-county");
    // Building group — CRITICAL fields
    expect(out.building?.use_code).toBe("0500");
    expect(out.building?.use_desc).toBe("Five or more apartments");
    expect(out.building?.year_built).toBe(1953);
    expect(out.building?.units).toBe(10);
    expect(out.building?.building_sqft).toBe(7564);
    expect(out.building?.construction_type).toBe("0500 · quality C");
    // Building group — USEFUL fields (C.S.1.7.0b)
    expect(out.building?.effective_year_built).toBe(1998); // NEW
    expect(out.building?.bedrooms).toBe(12);
    expect(out.building?.bathrooms).toBe(10);
    // C.S.1.7.0b — DROP fields no longer extracted even though
    // source publishes them.
    // @ts-expect-error — lot_sqft no longer in BuildingFacts type
    expect(out.building?.lot_sqft).toBeUndefined();
    // Owner group — LA still publishes nothing usable. The
    // ownership_type inference from Roll_HomeOwnersExemp was removed
    // in C.S.1.7.0b (homeowner-exemption is a tax-exempt indicator,
    // on the DROP list).
    expect(out.owner).toBeUndefined();
    // transaction grouped section — removed entirely in C.S.1.7.0b
    // @ts-expect-error — transaction no longer in PropertyFacts type
    expect(out.transaction).toBeUndefined();
    // Parcel id
    expect(out.parcel_id).toBe("7273-004-008");
    // Flat-field flatten for backwards compat
    expect(out.year_built).toBe(1953);
    expect(out.square_feet).toBe(7564);
    expect(out.units).toBe(10);
    expect(out.land_use_code).toBe("0500");
    expect(out.land_use_desc).toBe("Five or more apartments");
    expect(out.construction_type).toBe("0500 · quality C");
    // @ts-expect-error — lot_size_sqft removed from flat fields in C.S.1.7.0b
    expect(out.lot_size_sqft).toBeUndefined();
    // Owner of record stays undefined (LA doesn't publish)
    expect(out.owner_of_record).toBeUndefined();
  });

  it("ignores Roll_HomeOwnersExemp entirely (C.S.1.7.0b — was a DROP-list field)", () => {
    const out = normalizeCountyFeature(
      { ...LA_FULL_RECORD, Roll_HomeOwnersExemp: 7000 },
      LA_COUNTY,
    );
    // No owner section produced from the exemption flag anymore
    expect(out.owner).toBeUndefined();
    // No transaction section
    // @ts-expect-error — transaction removed from type
    expect(out.transaction).toBeUndefined();
  });

  it("handles partial records (missing optional fields don't crash)", () => {
    const sparse = {
      APN: "1234-005-002",
      SitusFullAddress: "100 Test St",
      UseCode: "0100",
      UseDescription: "Single Family Residence",
      // No YearBuilt1, no Units1, no Bedrooms1 — sparse parcel
    };
    const out = normalizeCountyFeature(sparse, LA_COUNTY);
    expect(out.parcel_id).toBe("1234-005-002");
    expect(out.land_use_code).toBe("0100");
    expect(out.land_use_desc).toBe("Single Family Residence");
    expect(out.year_built).toBeUndefined();
    expect(out.units).toBeUndefined();
    // No owner, no transaction sections produced
    expect(out.owner).toBeUndefined();
  });

  it("drops nonsense numeric values (year out of range, zero units, blank strings)", () => {
    const garbage = {
      APN: "1234-005-002",
      UseCode: "0100",
      YearBuilt1: "999", // out of range
      EffectiveYear1: "1500", // out of range
      Units1: 0,
      SQFTmain1: 0,
      DesignType1: "   ", // blank after trim
    };
    const out = normalizeCountyFeature(garbage, LA_COUNTY);
    expect(out.year_built).toBeUndefined();
    expect(out.building?.effective_year_built).toBeUndefined();
    expect(out.units).toBeUndefined();
    expect(out.square_feet).toBeUndefined();
    expect(out.construction_type).toBeUndefined();
  });
});

describe("normalizeCountyFeature — USEFUL fields wiring (C.S.1.7.0b)", () => {
  // These three fields (stories / sprinklered / roof_type) aren't
  // currently published by any wired county, but the readers exist
  // so future inspection-data sources can light them up. Tests use a
  // synthetic registry pointing at made-up source field names.
  const SYNTHETIC_COUNTY = {
    slug: "la-county" as const,
    county: "Synthetic",
    state: "CA" as const,
    client: "arcgis" as const,
    featureServiceUrl: "https://example.test/FeatureServer/0",
    fields: {
      stories: "STORIES_FIELD",
      sprinkleredField: "SPRINKLER_FIELD",
      roofTypeField: "ROOF_FIELD",
    },
  };

  it("extracts stories as a number", () => {
    const out = normalizeCountyFeature({ STORIES_FIELD: 4 }, SYNTHETIC_COUNTY);
    expect(out.building?.stories).toBe(4);
  });

  it("coerces sprinklered indicators — truthy ('Y') and falsy ('N')", () => {
    const yes = normalizeCountyFeature({ SPRINKLER_FIELD: "Y" }, SYNTHETIC_COUNTY);
    expect(yes.building?.sprinklered).toBe(true);
    const no = normalizeCountyFeature({ SPRINKLER_FIELD: "N" }, SYNTHETIC_COUNTY);
    expect(no.building?.sprinklered).toBe(false);
    // Ambiguous string leaves sprinklered undefined (don't guess)
    const maybe = normalizeCountyFeature({ SPRINKLER_FIELD: "maybe" }, SYNTHETIC_COUNTY);
    expect(maybe.building?.sprinklered).toBeUndefined();
  });

  it("passes roof_type through verbatim when present", () => {
    const out = normalizeCountyFeature({ ROOF_FIELD: "Composition Shingle" }, SYNTHETIC_COUNTY);
    expect(out.building?.roof_type).toBe("Composition Shingle");
  });

  it("no USEFUL fields → no building section produced (sparse parcel)", () => {
    const out = normalizeCountyFeature({}, SYNTHETIC_COUNTY);
    expect(out.building).toBeUndefined();
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
  it("extracts the building section from a downtown SD apartment record (insurance-tuned)", () => {
    // Shaped from a live SANDAG query (415 E Broadway, San Diego)
    const sdRecord: Record<string, unknown> = {
      apn: "5335730100",
      nucleus_use_cd: "210", // mapped → "Apartments" in registry
      year_effective: "1985",
      total_lvg_area: 24807,
      // SHAPE__Area + asr_total still in the source response, but
      // no longer mapped (C.S.1.7.0b DROP list).
      SHAPE__Area: 7398.85,
      asr_total: 3342805,
      unitqty: 20,
      bedrooms: "000", // SD sentinel — should be dropped by readNumber + n > 0
      baths: "000",
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
    // C.S.1.7.0b — DROP fields stay undefined
    // @ts-expect-error — lot_sqft removed from BuildingFacts
    expect(out.building?.lot_sqft).toBeUndefined();
    // @ts-expect-error — transaction removed from PropertyFacts
    expect(out.transaction).toBeUndefined();
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
  it("extracts the building + mailing sections from a downtown Santa Ana record (insurance-tuned)", () => {
    // Shaped from a live OC LegalLotsAttributeOpenData query (104 E 1st St,
    // Santa Ana). OC publishes mailing address (rare for CA).
    const ocRecord: Record<string, unknown> = {
      AssessmentNo: "398-512-01",
      SiteAddress: "104 E 1ST ST",
      MailAddress: "104 E 1ST ST  SANTA ANA 92701-5311",
      // LandVal / ImprovedVal / Shape__Area still in source but
      // no longer mapped (C.S.1.7.0b DROP list).
      LandVal: "583821",
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
    // OC's useDescField wins → flat land_use_desc populated
    expect(out.land_use_desc).toBe("Commercial");
    // Owner: only mailing_address published, no name
    expect(out.owner?.mailing_address).toBe("104 E 1ST ST  SANTA ANA 92701-5311");
    expect(out.owner?.name).toBeUndefined();
    // C.S.1.7.0b — DROP fields stay undefined
    // @ts-expect-error — lot_sqft removed from BuildingFacts
    expect(out.building?.lot_sqft).toBeUndefined();
    // @ts-expect-error — transaction removed from PropertyFacts
    expect(out.transaction).toBeUndefined();
  });

  it("handles thin OC records (use code missing — common on this layer)", () => {
    const out = normalizeCountyFeature(
      { AssessmentNo: "111-222-33" },
      ORANGE_COUNTY,
    );
    expect(out.parcel_id).toBe("111-222-33");
    expect(out.building).toBeUndefined(); // no useCode → no building section
    expect(out.year_built).toBeUndefined();
  });
});

describe("normalizeCountyFeature — Riverside County", () => {
  it("extracts the use desc + owner mailing from a CREST record (insurance-tuned)", () => {
    // Shaped from a live Riverside PARCELS_CREST query (6570 Magnolia Ave).
    const rivRecord: Record<string, unknown> = {
      APN: "225124026",
      MAIL_STREET: "48570 SHADY VIEW DR",
      MAIL_CITY: "PALM DESERT CA 92260", // city+state+zip combined
      SITUS_STREET: "6570 MAGNOLIA AVE",
      CLASS_CODE: "Bank", // already human-readable, not a numeric code
      // ACREAGE / LAND / STRUCTURES / SHAPE.STArea() still in source,
      // but no longer mapped (C.S.1.7.0b DROP list).
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
    // Owner: mailing-only (first CA county to publish mailing)
    expect(out.owner?.mailing_address).toBe("48570 SHADY VIEW DR");
    expect(out.owner?.mailing_city).toBe("PALM DESERT CA 92260"); // combined string
    expect(out.owner?.name).toBeUndefined();
    // C.S.1.7.0b — DROP fields stay undefined
    // @ts-expect-error — lot_sqft removed from BuildingFacts
    expect(out.building?.lot_sqft).toBeUndefined();
    // @ts-expect-error — transaction removed from PropertyFacts
    expect(out.transaction).toBeUndefined();
    // @ts-expect-error — lot_size_sqft removed from flat fields
    expect(out.lot_size_sqft).toBeUndefined();
    // Year built / sqft / units stay undefined — those are in the joined
    // CREST_PROPERTY_CHAR table that this sprint doesn't query.
    expect(out.year_built).toBeUndefined();
    expect(out.square_feet).toBeUndefined();
    expect(out.units).toBeUndefined();
  });
});
