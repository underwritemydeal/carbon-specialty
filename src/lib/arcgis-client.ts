/**
 * Generic ArcGIS REST FeatureService query client — sprint C.S.1.7.0a.
 *
 * Wraps the standard ArcGIS REST `/query` endpoint pattern so we can
 * point it at any FeatureServer (LA County, Riverside, Orange,
 * etc.) and get back attribute records without re-implementing the
 * query-string + response-parsing boilerplate per county.
 *
 * Two query modes:
 *   - geometry-based  (point + buffer in meters) — most reliable for
 *     parcel lookups when an upstream geocoder gives us lat/lng
 *   - where-clause    (SQL-ish WHERE) — fallback for parcel-id /
 *     address-string matching
 *
 * Silent-null on every failure mode, matching the convention the rest
 * of /api/property/enrich uses (fetchRealie, fetchGeocoding). The
 * `[carbon-enrich] ARCGIS_*` diagnostic logging surfaces the actual
 * upstream behavior to Vercel logs so a future "all counties return
 * empty" symptom is debuggable end-to-end.
 *
 * Esri spatial reference shorthand:
 *   - inSR=4326  (WGS84 lat/lng — what Google Geocoding returns)
 *   - outSR=4326 (so callers don't have to re-project)
 */

/** Spatial-reference WKID for WGS84 (standard web lat/lng). */
export const ESRI_SR_WGS84 = 4326;

/** Default search radius (meters) for point queries. Mirrors the
 *  C.S.1.6.7 Regrid lat-lon decision — 50m is comfortable for a
 *  building footprint without overlapping neighbors on most urban
 *  parcels. Counties that need a different default can override per
 *  the registry config. */
export const ARCGIS_DEFAULT_RADIUS_M = 50;

/** A single ArcGIS feature — attributes-only is enough for our
 *  enrichment use case (we don't render the geometry). */
export interface ArcGISFeature {
  attributes: Record<string, unknown>;
  /** Raw geometry left untyped — callers that need it can cast.
   *  Most enrichment consumers only read attributes. */
  geometry?: unknown;
}

export interface ArcGISQueryParams {
  /** When set, runs a geometry-based point query. lat/lon in WGS84. */
  point?: { lat: number; lon: number };
  /** Meters from the point to include. Required when `point` is set;
   *  default REGRID_DEFAULT_RADIUS_M if omitted. */
  radiusMeters?: number;
  /** When set, runs a where-clause query. ArcGIS SQL-92 dialect. */
  where?: string;
  /** Comma-separated field list or "*". Default "*". */
  outFields?: string;
  /** Max results. Default 1. */
  resultRecordCount?: number;
}

interface ArcGISQueryResponse {
  features?: ArcGISFeature[];
  /** ArcGIS surfaces structured errors here when status is 200 but
   *  the request was rejected (invalid where clause, missing param). */
  error?: {
    code?: number;
    message?: string;
    details?: string[];
  };
}

/**
 * Run a query against a single ArcGIS FeatureService layer URL of
 * the form ".../FeatureServer/<layerId>" — the caller passes the
 * layer URL; this function appends "/query" and the param string.
 *
 * Returns the parsed features array on success; null on any failure
 * (network, non-200, ArcGIS-wrapped error body, parse failure). The
 * caller decides what to do with empty results — for parcel lookups
 * an empty array is a coverage gap, not an error.
 */
export async function queryFeatureService(
  layerUrl: string,
  params: ArcGISQueryParams,
): Promise<ArcGISFeature[] | null> {
  const url = buildQueryUrl(layerUrl, params);
  try {
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) {
      let bodyPreview = "";
      try {
        bodyPreview = (await res.text()).slice(0, 200);
      } catch {
        // ignore
      }
      console.warn(
        `[carbon-enrich] ARCGIS_NON_OK status=${res.status} url=${layerUrl} body=${bodyPreview}`,
      );
      return null;
    }
    const rawBody = await res.text();
    let data: ArcGISQueryResponse;
    try {
      data = JSON.parse(rawBody) as ArcGISQueryResponse;
    } catch (e) {
      console.warn(
        `[carbon-enrich] ARCGIS_PARSE_FAIL url=${layerUrl} body=${rawBody.slice(0, 200)} err=${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
    // ArcGIS error envelope (HTTP 200 with `error` key).
    if (data.error) {
      console.warn(
        `[carbon-enrich] ARCGIS_QUERY_ERROR url=${layerUrl} code=${data.error.code} msg=${data.error.message} details=${(data.error.details ?? []).join("; ").slice(0, 200)}`,
      );
      return null;
    }
    const features = data.features ?? [];
    if (features.length === 0) {
      console.warn(
        `[carbon-enrich] ARCGIS_EMPTY url=${layerUrl} params=${JSON.stringify(params)}`,
      );
    }
    return features;
  } catch (e) {
    console.warn(
      `[carbon-enrich] ARCGIS_THROW url=${layerUrl} err=${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}

/** Compose an ArcGIS /query URL from a layer URL + our normalized
 *  params. Exported for tests. */
export function buildQueryUrl(layerUrl: string, params: ArcGISQueryParams): string {
  const usp = new URLSearchParams({
    f: "json",
    outFields: params.outFields ?? "*",
    resultRecordCount: String(params.resultRecordCount ?? 1),
  });

  if (params.point) {
    // ArcGIS geometry param can be either a JSON object or the shorthand
    // "x,y" pair when the geometry type is point. We use the JSON form
    // so the SR is explicit alongside the coordinates.
    const geom = JSON.stringify({
      x: params.point.lon,
      y: params.point.lat,
      spatialReference: { wkid: ESRI_SR_WGS84 },
    });
    usp.set("geometry", geom);
    usp.set("geometryType", "esriGeometryPoint");
    usp.set("inSR", String(ESRI_SR_WGS84));
    usp.set("outSR", String(ESRI_SR_WGS84));
    usp.set("spatialRel", "esriSpatialRelIntersects");
    usp.set("distance", String(params.radiusMeters ?? ARCGIS_DEFAULT_RADIUS_M));
    usp.set("units", "esriSRUnit_Meter");
  } else if (params.where) {
    usp.set("where", params.where);
  } else {
    // No filter → "1=1" returns everything; require an explicit filter.
    usp.set("where", "1=0");
  }

  const base = layerUrl.endsWith("/query") ? layerUrl : `${layerUrl}/query`;
  return `${base}?${usp.toString()}`;
}
