import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enrichAddress, normalizeRegridFields, buildStreetViewUrl } from "./route";

/**
 * Mock-based unit tests for the enrichment composer.
 *
 * Stubs `global.fetch` for the two upstream calls (Google Geocoding,
 * Regrid Parcel API) and asserts the composed PropertyFacts shape +
 * the sources_succeeded / sources_failed accounting.
 */

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = "test-google-key";
  process.env.REGRID_API_TOKEN = "test-regrid-token";
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

function geocodingOk() {
  return new Response(
    JSON.stringify({
      status: "OK",
      results: [
        {
          formatted_address: "1247 Pine Ave, Long Beach, CA 90802, USA",
          geometry: { location: { lat: 33.7766, lng: -118.1933 } },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function regridOk(fields: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      parcels: { features: [{ properties: { fields } }] },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("enrichAddress", () => {
  it("composes full PropertyFacts when both upstreams succeed", async () => {
    mockFetch((url) => {
      if (url.includes("maps.googleapis.com/maps/api/geocode")) return geocodingOk();
      if (url.includes("app.regrid.com/api/v2/parcels"))
        return regridOk({
          yearbuilt: 1962,
          numunits: 24,
          bldg_sqft: 18200,
          struct: "Stucco frame",
          gisacre: 0.22,
          owner: "PINE AVE HOLDINGS LLC",
          parcelnumb: "7274-016-013",
        });
      return new Response("not found", { status: 404 });
    });

    const facts = await enrichAddress("1247 Pine Ave Long Beach");
    expect(facts.canonical_address).toBe("1247 Pine Ave, Long Beach, CA 90802, USA");
    expect(facts.lat).toBeCloseTo(33.7766);
    expect(facts.lng).toBeCloseTo(-118.1933);
    expect(facts.year_built).toBe(1962);
    expect(facts.units).toBe(24);
    expect(facts.square_feet).toBe(18200);
    expect(facts.construction_type).toBe("Stucco frame");
    expect(facts.owner_of_record).toBe("PINE AVE HOLDINGS LLC");
    expect(facts.parcel_id).toBe("7274-016-013");
    expect(facts.lot_size_sqft).toBe(Math.round(0.22 * 43560));
    expect(facts.street_view_url).toContain("streetview");
    // URLSearchParams encodes spaces as `+`, not %20
    expect(facts.street_view_url).toContain("1247+Pine+Ave");
    expect(facts.sources_succeeded.sort()).toEqual(["geocoding", "regrid", "streetview"]);
    expect(facts.sources_failed).toEqual([]);
  });

  it("returns geocoding + streetview when Regrid has no coverage", async () => {
    mockFetch((url) => {
      if (url.includes("maps.googleapis.com/maps/api/geocode")) return geocodingOk();
      if (url.includes("app.regrid.com/api/v2/parcels"))
        return new Response(JSON.stringify({ parcels: { features: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      return new Response("not found", { status: 404 });
    });

    const facts = await enrichAddress("123 Made Up St, Nowhere");
    expect(facts.canonical_address).toBe("1247 Pine Ave, Long Beach, CA 90802, USA");
    expect(facts.year_built).toBeUndefined();
    expect(facts.units).toBeUndefined();
    expect(facts.sources_succeeded).toContain("geocoding");
    expect(facts.sources_succeeded).toContain("streetview");
    expect(facts.sources_failed).toEqual(["regrid"]);
  });

  it("returns regrid + streetview when geocoding fails — falls back to raw address for Regrid + Street View", async () => {
    mockFetch((url) => {
      if (url.includes("maps.googleapis.com/maps/api/geocode"))
        return new Response(
          JSON.stringify({ status: "ZERO_RESULTS", results: [] }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      if (url.includes("app.regrid.com/api/v2/parcels"))
        return regridOk({ yearbuilt: 1985, numunits: 12 });
      return new Response("not found", { status: 404 });
    });

    const facts = await enrichAddress("Some Building, Long Beach");
    expect(facts.canonical_address).toBeUndefined();
    expect(facts.year_built).toBe(1985);
    expect(facts.units).toBe(12);
    expect(facts.street_view_url).toContain("Some+Building"); // raw fallback (URLSearchParams encodes space as +)
    expect(facts.sources_succeeded.sort()).toEqual(["regrid", "streetview"]);
    expect(facts.sources_failed).toEqual(["geocoding"]);
  });

  it("graceful-degrades when env vars are missing — no upstream calls, all sources_failed", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.REGRID_API_TOKEN;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const facts = await enrichAddress("anything");
    expect(facts.sources_succeeded).toEqual([]);
    expect(facts.sources_failed.sort()).toEqual(["geocoding", "regrid", "streetview"]);
    expect(facts.canonical_address).toBeUndefined();
    expect(facts.street_view_url).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("normalizeRegridFields — defensive field mapping", () => {
  it("uses fallback field names when primary is absent", () => {
    const out = normalizeRegridFields({
      yearbuilt: "1975", // string → coerced
      units: 8, // fallback for numunits
      sqft: 5400, // fallback for bldg_sqft
      ll_owner: "Test Owner",
      ll_uuid: "abc-123",
      ll_gisacre: "0.1",
    });
    expect(out.year_built).toBe(1975);
    expect(out.units).toBe(8);
    expect(out.square_feet).toBe(5400);
    expect(out.owner_of_record).toBe("Test Owner");
    expect(out.parcel_id).toBe("abc-123");
    expect(out.lot_size_sqft).toBe(Math.round(0.1 * 43560));
  });

  it("drops nonsense values (year out of range, zero units, blank strings)", () => {
    const out = normalizeRegridFields({
      yearbuilt: 999, // out of range
      numunits: 0,
      bldg_sqft: 0,
      owner: "   ", // blank after trim
    });
    expect(out.year_built).toBeUndefined();
    expect(out.units).toBeUndefined();
    expect(out.square_feet).toBeUndefined();
    expect(out.owner_of_record).toBeUndefined();
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
