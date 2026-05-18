import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSocrataUrl,
  querySocrataDataset,
  SOCRATA_DEFAULT_RADIUS_M,
} from "./socrata-client";

/**
 * Tests for the generic Socrata SoQL client introduced in
 * C.S.1.7.0d. Covers URL composition (geometry + where + baseWhere
 * + select + limit) and the error/empty handling that matches the
 * arcgis-client convention (silent-null + [carbon-enrich] SOCRATA_*
 * logging).
 */

const SF_TAX_ROLLS_URL = "https://data.sfgov.org/resource/wv5m-vpq2.json";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildSocrataUrl", () => {
  it("composes a within_circle SoQL function from a point + default radius", () => {
    const url = buildSocrataUrl(SF_TAX_ROLLS_URL, {
      point: { lat: 37.793, lon: -122.432 },
    });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain(
      `within_circle(the_geom,37.793,-122.432,${SOCRATA_DEFAULT_RADIUS_M})`,
    );
    expect(decoded).toContain("$limit=1");
  });

  it("uses a custom geometryField when the dataset doesn't use the_geom", () => {
    const url = buildSocrataUrl(SF_TAX_ROLLS_URL, {
      point: { lat: 1, lon: 2 },
      geometryField: "location",
      radiusMeters: 75,
    });
    expect(decodeURIComponent(url)).toContain("within_circle(location,1,2,75)");
  });

  it("AND-s baseWhere onto a geometry query", () => {
    const url = buildSocrataUrl(SF_TAX_ROLLS_URL, {
      point: { lat: 37.79, lon: -122.43 },
      baseWhere: "closed_roll_year='2024'",
    });
    const decoded = decodeURIComponent(url);
    expect(decoded).toMatch(/within_circle\(.+\).+AND.+closed_roll_year='2024'/);
  });

  it("AND-s the caller's $where onto baseWhere", () => {
    const url = buildSocrataUrl(SF_TAX_ROLLS_URL, {
      where: "use_code='MRES'",
      baseWhere: "closed_roll_year='2024'",
    });
    // URLSearchParams encodes spaces as '+'; SF DataSF accepts both
    // '+' and '%20' for SoQL spaces (live-verified). Normalize for assertion.
    const decoded = decodeURIComponent(url).replace(/\+/g, " ");
    expect(decoded).toContain("use_code='MRES'");
    expect(decoded).toContain("closed_roll_year='2024'");
    expect(decoded).toContain(" AND ");
  });

  it("passes through $select when set", () => {
    const url = buildSocrataUrl(SF_TAX_ROLLS_URL, {
      where: "parcel_number='0582025'",
      select: "parcel_number,use_code,year_property_built",
    });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("$select=parcel_number,use_code,year_property_built");
  });

  it("respects an explicit limit override", () => {
    const url = buildSocrataUrl(SF_TAX_ROLLS_URL, {
      where: "use_code='MRES'",
      limit: 25,
    });
    expect(decodeURIComponent(url)).toContain("$limit=25");
  });
});

describe("querySocrataDataset", () => {
  it("returns the parsed rows array on a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ parcel_number: "0582025" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const rows = await querySocrataDataset(SF_TAX_ROLLS_URL, {
      where: "parcel_number='0582025'",
    });
    expect(rows).toEqual([{ parcel_number: "0582025" }]);
  });

  it("returns null on a non-200 (4xx/5xx)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad", { status: 502 })),
    );
    const rows = await querySocrataDataset(SF_TAX_ROLLS_URL, {
      where: "parcel_number='0582025'",
    });
    expect(rows).toBeNull();
  });

  it("returns null when the body parses to an error envelope (200 + errorCode)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ errorCode: "query.soql.no-such-column", message: "bad" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const rows = await querySocrataDataset(SF_TAX_ROLLS_URL, {
      where: "parcel_number='0582025'",
    });
    expect(rows).toBeNull();
  });

  it("returns null when the body is not an array (unexpected shape)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ rows: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const rows = await querySocrataDataset(SF_TAX_ROLLS_URL, { where: "1=1" });
    expect(rows).toBeNull();
  });

  it("returns null on parse failure (non-JSON body)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>not json</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    const rows = await querySocrataDataset(SF_TAX_ROLLS_URL, { where: "1=1" });
    expect(rows).toBeNull();
  });

  it("returns null on fetch throw (network error)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    const rows = await querySocrataDataset(SF_TAX_ROLLS_URL, { where: "1=1" });
    expect(rows).toBeNull();
  });

  it("returns an empty array (not null) when the dataset has no matching rows", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const rows = await querySocrataDataset(SF_TAX_ROLLS_URL, { where: "1=0" });
    expect(rows).toEqual([]);
  });
});
