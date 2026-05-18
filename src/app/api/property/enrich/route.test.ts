import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enrichAddress, normalizeRealieFields, buildStreetViewUrl } from "./route";

/**
 * Mock-based unit tests for the enrichment composer.
 *
 * Stubs `global.fetch` for the upstream calls (Google Geocoding,
 * Realie Property Data) and asserts the composed PropertyFacts
 * shape + the sources_succeeded / sources_failed accounting.
 *
 * Sprint C.S.1.6.8 — swapped Regrid → Realie. Tests rewritten end-
 * to-end.
 */

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = "test-google-key";
  process.env.REALIE_API_TOKEN = "test-realie-token";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn((input: Parameters<typeof fetch>[0]) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    return Promise.resolve(handler(url));
  }));
}

/** Google Geocoding response with full address_components — Realie
 *  requires structured state + street_line, so the geocoding mock
 *  has to surface those component types. */
function geocodingOk() {
  return new Response(
    JSON.stringify({
      status: "OK",
      results: [
        {
          formatted_address: "1247 Pine Ave, Long Beach, CA 90802, USA",
          geometry: { location: { lat: 33.7766, lng: -118.1933 } },
          address_components: [
            { long_name: "1247", short_name: "1247", types: ["street_number"] },
            { long_name: "Pine Avenue", short_name: "Pine Ave", types: ["route"] },
            { long_name: "Long Beach", short_name: "Long Beach", types: ["locality", "political"] },
            { long_name: "Los Angeles County", short_name: "Los Angeles County", types: ["administrative_area_level_2", "political"] },
            { long_name: "California", short_name: "CA", types: ["administrative_area_level_1", "political"] },
            { long_name: "United States", short_name: "US", types: ["country", "political"] },
            { long_name: "90802", short_name: "90802", types: ["postal_code"] },
          ],
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function realieOk(property: Record<string, unknown>) {
  return new Response(JSON.stringify({ property }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("enrichAddress", () => {
  it("composes full PropertyFacts when both upstreams succeed", async () => {
    mockFetch((url) => {
      if (url.includes("maps.googleapis.com/maps/api/geocode")) return geocodingOk();
      if (url.includes("app.realie.ai/api/public/property/address"))
        return realieOk({
          yearBuilt: 1962,
          buildingArea: 18200,
          constructionType: "Stucco frame",
          landArea: 9583, // sqft directly — no acres conversion
          ownerName: "PINE AVE HOLDINGS LLC",
          parcelId: "7274-016-013",
          useCode: "1104", // APARTMENT HOUSE (5+ UNITS)
        });
      return new Response("not found", { status: 404 });
    });

    const facts = await enrichAddress("1247 Pine Ave Long Beach");
    expect(facts.canonical_address).toBe("1247 Pine Ave, Long Beach, CA 90802, USA");
    expect(facts.lat).toBeCloseTo(33.7766);
    expect(facts.lng).toBeCloseTo(-118.1933);
    expect(facts.year_built).toBe(1962);
    expect(facts.square_feet).toBe(18200);
    expect(facts.construction_type).toBe("Stucco frame");
    expect(facts.lot_size_sqft).toBe(9583);
    expect(facts.owner_of_record).toBe("PINE AVE HOLDINGS LLC");
    expect(facts.parcel_id).toBe("7274-016-013");
    expect(facts.land_use_code).toBe("1104");
    expect(facts.land_use_desc).toBe("Apartment House (5+ Units)"); // mapped from inline table
    expect(facts.street_view_url).toContain("streetview");
    expect(facts.street_view_url).toContain("1247+Pine+Ave");
    expect(facts.sources_succeeded.sort()).toEqual(["geocoding", "realie", "streetview"]);
    expect(facts.sources_failed).toEqual([]);
  });

  it("returns geocoding + streetview when Realie has no coverage", async () => {
    mockFetch((url) => {
      if (url.includes("maps.googleapis.com/maps/api/geocode")) return geocodingOk();
      if (url.includes("app.realie.ai/api/public/property/address"))
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      return new Response("not found", { status: 404 });
    });

    const facts = await enrichAddress("123 Made Up St, Nowhere");
    expect(facts.canonical_address).toBe("1247 Pine Ave, Long Beach, CA 90802, USA");
    expect(facts.year_built).toBeUndefined();
    expect(facts.land_use_desc).toBeUndefined();
    expect(facts.sources_succeeded).toContain("geocoding");
    expect(facts.sources_succeeded).toContain("streetview");
    expect(facts.sources_failed).toEqual(["realie"]);
  });

  it("skips Realie when geocoding fails — Realie requires structured state + street_line", async () => {
    // Realie needs `state` + `address` (street line 1) as separate
    // query params per its API contract. Without geocoding's
    // address_components we can't reliably parse those. Street View
    // still falls back to the raw user-typed address.
    const fetchSpy = vi.fn((input: Parameters<typeof fetch>[0]) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.includes("maps.googleapis.com/maps/api/geocode"))
        return Promise.resolve(
          new Response(
            JSON.stringify({ status: "ZERO_RESULTS", results: [] }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      return Promise.resolve(new Response("not found", { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const facts = await enrichAddress("Some Building, Long Beach");
    expect(facts.canonical_address).toBeUndefined();
    expect(facts.year_built).toBeUndefined();
    expect(facts.street_view_url).toContain("Some+Building");
    expect(facts.sources_succeeded.sort()).toEqual(["streetview"]);
    expect(facts.sources_failed.sort()).toEqual(["geocoding", "realie"]);
    // Realie endpoint was NOT called
    const realieCalls = fetchSpy.mock.calls.filter((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as URL).toString();
      return u.includes("app.realie.ai");
    });
    expect(realieCalls).toHaveLength(0);
  });

  it("calls Realie /property/address with state + address from geocoding (C.S.1.6.8)", async () => {
    // Confirm the request shape: GET on /api/public/property/address/
    // with state=<CA>, address=<street line 1>, optional city+county,
    // and Authorization header = raw token (no Bearer prefix).
    const fetchSpy = vi.fn((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url.includes("maps.googleapis.com/maps/api/geocode"))
        return Promise.resolve(geocodingOk());
      if (url.includes("app.realie.ai/api/public/property/address")) {
        // Capture the headers for assertion later
        return Promise.resolve(
          realieOk({
            yearBuilt: 1947,
            buildingArea: 1450,
            useCode: "1001", // SINGLE FAMILY RESIDENTIAL
            ownerName: "JANE DOE",
            parcelId: "138-12-345",
          }),
        );
      }
      // Reference init so eslint doesn't trip on unused param
      void init;
      return Promise.resolve(new Response("not found", { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const facts = await enrichAddress("1418 E Edgemont Ave, Phoenix, AZ");

    const realieCall = fetchSpy.mock.calls.find((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as URL).toString();
      return u.includes("app.realie.ai/api/public/property/address");
    });
    expect(realieCall).toBeDefined();
    const realieUrl = typeof realieCall![0] === "string" ? realieCall![0] : (realieCall![0] as URL).toString();

    // URL has state + address from the geocoding mock (state=CA,
    // address="1247 Pine Ave"). C.S.1.6.8 hot-fix #2 — city/county
    // are intentionally NOT sent; prod probes showed Realie returns
    // 404 when those fields are populated even though state+address
    // alone match real parcels in the same jurisdiction.
    expect(realieUrl).toContain("state=CA");
    expect(realieUrl).toContain("address=1247+Pine+Ave"); // URLSearchParams encodes space as +
    expect(realieUrl).not.toContain("city=");
    expect(realieUrl).not.toContain("county=");

    // Auth header = raw token, NO "Bearer " prefix
    const init = realieCall![1] as RequestInit | undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("test-realie-token");
    expect(headers.Authorization).not.toMatch(/^Bearer /);

    // Normalized fields landed, including the useCode → desc map
    expect(facts.year_built).toBe(1947);
    expect(facts.square_feet).toBe(1450);
    expect(facts.land_use_code).toBe("1001");
    expect(facts.land_use_desc).toBe("Single Family Residential");
    expect(facts.owner_of_record).toBe("JANE DOE");
    expect(facts.parcel_id).toBe("138-12-345");
    expect(facts.sources_succeeded.sort()).toEqual(["geocoding", "realie", "streetview"]);
    expect(facts.sources_failed).toEqual([]);
  });

  it("graceful-degrades when env vars are missing — no upstream calls, all sources_failed", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.REALIE_API_TOKEN;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const facts = await enrichAddress("anything");
    expect(facts.sources_succeeded).toEqual([]);
    expect(facts.sources_failed.sort()).toEqual(["geocoding", "realie", "streetview"]);
    expect(facts.canonical_address).toBeUndefined();
    expect(facts.street_view_url).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("normalizeRealieFields — defensive field mapping", () => {
  it("maps Realie's flat property object onto PropertyFacts", () => {
    const out = normalizeRealieFields({
      yearBuilt: 1975,
      buildingArea: 5400,
      constructionType: "Wood frame",
      landArea: 6500, // sqft directly
      ownerName: "Test Owner",
      parcelId: "abc-123",
      useCode: "1100", // RESIDENTIAL INCOME (MULTI-FAMILY)
    });
    expect(out.year_built).toBe(1975);
    expect(out.square_feet).toBe(5400);
    expect(out.construction_type).toBe("Wood frame");
    expect(out.lot_size_sqft).toBe(6500);
    expect(out.owner_of_record).toBe("Test Owner");
    expect(out.parcel_id).toBe("abc-123");
    expect(out.land_use_code).toBe("1100");
    expect(out.land_use_desc).toBe("Multifamily Residential");
  });

  it("falls back to acres when landArea is absent", () => {
    const out = normalizeRealieFields({
      acres: 0.5,
    });
    expect(out.lot_size_sqft).toBe(Math.round(0.5 * 43560));
  });

  it("drops nonsense values (year out of range, zero/blank values)", () => {
    const out = normalizeRealieFields({
      yearBuilt: 999, // out of range
      buildingArea: 0,
      landArea: 0,
      ownerName: "   ", // blank after trim
    });
    expect(out.year_built).toBeUndefined();
    expect(out.square_feet).toBeUndefined();
    expect(out.lot_size_sqft).toBeUndefined();
    expect(out.owner_of_record).toBeUndefined();
  });

  it("falls through to 'Use code <code>' for unmapped useCode values", () => {
    const out = normalizeRealieFields({
      useCode: "9999", // not in REALIE_USE_CODE_DESC
    });
    expect(out.land_use_code).toBe("9999");
    expect(out.land_use_desc).toBe("Use code 9999");
  });
});

describe("buildStreetViewUrl", () => {
  it("URL-encodes the address and includes the key", () => {
    const url = buildStreetViewUrl("1247 Pine Ave, Long Beach, CA", "GKEY");
    expect(url).toContain("https://maps.googleapis.com/maps/api/streetview?");
    expect(url).toContain("location=1247+Pine+Ave%2C+Long+Beach%2C+CA");
    expect(url).toContain("key=GKEY");
    expect(url).toContain("size=640x400");
  });
});
