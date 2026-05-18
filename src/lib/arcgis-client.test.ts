import { describe, it, expect, vi, afterEach } from "vitest";
import { buildQueryUrl, queryFeatureService } from "./arcgis-client";

/**
 * Tests for the generic ArcGIS REST FeatureService client introduced
 * in C.S.1.7.0a. The client is upstream-agnostic; these tests cover
 * URL construction + every failure-mode branch with the
 * [carbon-enrich] ARCGIS_* logging convention.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const LAYER_URL =
  "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/LA_County_Parcels/FeatureServer/0";

describe("buildQueryUrl", () => {
  it("builds a geometry-based point query with default radius", () => {
    const url = buildQueryUrl(LAYER_URL, {
      point: { lat: 33.7822575, lon: -118.1925638 },
    });
    expect(url).toContain(`${LAYER_URL}/query?`);
    expect(url).toContain("geometryType=esriGeometryPoint");
    expect(url).toContain("inSR=4326");
    expect(url).toContain("outSR=4326");
    expect(url).toContain("spatialRel=esriSpatialRelIntersects");
    expect(url).toContain("distance=50");
    expect(url).toContain("units=esriSRUnit_Meter");
    expect(url).toContain("outFields=*");
    expect(url).toContain("resultRecordCount=1");
    expect(url).toContain("f=json");
    // geometry JSON contains the WGS84 SR + correct x/y
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('"x":-118.1925638');
    expect(decoded).toContain('"y":33.7822575');
    expect(decoded).toContain('"wkid":4326');
  });

  it("respects an overridden radius and result count", () => {
    const url = buildQueryUrl(LAYER_URL, {
      point: { lat: 0, lon: 0 },
      radiusMeters: 250,
      resultRecordCount: 5,
    });
    expect(url).toContain("distance=250");
    expect(url).toContain("resultRecordCount=5");
  });

  it("builds a where-clause query when no point is given", () => {
    const url = buildQueryUrl(LAYER_URL, { where: "APN='1234-005-002'" });
    expect(url).toContain("where=APN%3D%271234-005-002%27");
    expect(url).not.toContain("geometryType=");
    expect(url).not.toContain("distance=");
  });

  it("falls through to where=1=0 (no results) when no filter is supplied — guards against accidental full-scans", () => {
    const url = buildQueryUrl(LAYER_URL, {});
    expect(url).toContain("where=1%3D0");
  });

  it("appends /query when the layer URL doesn't already end in it", () => {
    expect(buildQueryUrl(LAYER_URL, { where: "1=1" })).toContain(`${LAYER_URL}/query?`);
    expect(
      buildQueryUrl(`${LAYER_URL}/query`, { where: "1=1" }),
    ).toContain(`${LAYER_URL}/query?`);
  });
});

describe("queryFeatureService", () => {
  it("returns the features array on a happy 200 response", async () => {
    const featuresIn = [
      { attributes: { APN: "1234-005-002", UseCode: "0500" } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ features: featuresIn }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const out = await queryFeatureService(LAYER_URL, {
      point: { lat: 33.78, lon: -118.19 },
    });
    expect(out).toEqual(featuresIn);
  });

  it("returns an empty array (not null) when 200 with zero features — caller decides what empty means", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ features: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const out = await queryFeatureService(LAYER_URL, {
      point: { lat: 0, lon: 0 },
    });
    expect(out).toEqual([]);
    // ARCGIS_EMPTY logged for diagnosability
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[carbon-enrich] ARCGIS_EMPTY"),
    );
  });

  it("returns null + logs ARCGIS_NON_OK on non-200 HTTP status", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("server is on fire", {
          status: 503,
          headers: { "content-type": "text/plain" },
        }),
      ),
    );

    const out = await queryFeatureService(LAYER_URL, { where: "1=1" });
    expect(out).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/ARCGIS_NON_OK status=503/),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("body=server is on fire"),
    );
  });

  it("returns null + logs ARCGIS_QUERY_ERROR when ArcGIS embeds an error envelope in a 200 response", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 400, message: "Invalid where clause", details: ["bad syntax"] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const out = await queryFeatureService(LAYER_URL, { where: "BAD SYNTAX" });
    expect(out).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ARCGIS_QUERY_ERROR"),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid where clause"),
    );
  });

  it("returns null + logs ARCGIS_PARSE_FAIL when the response isn't JSON", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>404 not found</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    const out = await queryFeatureService(LAYER_URL, { where: "1=1" });
    expect(out).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ARCGIS_PARSE_FAIL"),
    );
  });

  it("returns null + logs ARCGIS_THROW on network failure", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ETIMEDOUT")),
    );

    const out = await queryFeatureService(LAYER_URL, { where: "1=1" });
    expect(out).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/ARCGIS_THROW.+ETIMEDOUT/),
    );
  });
});
