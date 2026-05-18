/**
 * Generic Socrata SoQL query client — sprint C.S.1.7.0d.
 *
 * Wraps the standard Socrata Open Data API pattern so we can point
 * it at any DataSF (or other Socrata-backed) dataset and get back
 * rows without re-implementing query-string + response-parsing
 * boilerplate per dataset.
 *
 * Two query modes:
 *   - geometry-based (point + buffer in meters) — uses SoQL's
 *     within_circle(geometryField, lat, lon, meters) function
 *   - where-clause   (raw SoQL $where) — fallback for parcel-id /
 *     address-string matching
 *
 * `baseWhere` (per-dataset constant filter) is AND-ed onto whatever
 * the caller passes. SF Tax Rolls uses this to filter to the latest
 * `closed_roll_year` so a parcel that has rolls for every fiscal
 * year back to 2007 returns only the current year's snapshot.
 *
 * Silent-null on every failure mode, matching the convention the
 * rest of /api/property/enrich uses (fetchRealie, fetchGeocoding,
 * queryFeatureService). The `[carbon-enrich] SOCRATA_*` diagnostic
 * logging surfaces upstream behavior to Vercel logs.
 *
 * No auth — DataSF datasets are public. An `X-App-Token` header
 * would unlock higher rate limits if Carbon ever runs into the
 * shared-tenant throttle, but the 1000-req/hour anonymous limit
 * comfortably covers chat-driven enrichment.
 */

/** Default search radius (meters) for point queries. Mirrors the
 *  ArcGIS default and the C.S.1.6.7 lat-lon decision — 50m is the
 *  right floor for an SF parcel (median ~25ft frontage, smaller than
 *  LA but the 50m circle still catches the right parcel even when
 *  Google geocodes to the street centerline). */
export const SOCRATA_DEFAULT_RADIUS_M = 50;

/** Raw row from a Socrata JSON response. Attributes top-level; no
 *  attributes/geometry split like ArcGIS. */
export type SocrataRow = Record<string, unknown>;

export interface SocrataQueryParams {
  /** When set, runs a geometry-based point query using
   *  within_circle(geometryField, lat, lon, distance). */
  point?: { lat: number; lon: number };
  /** Meters from the point to include. Default SOCRATA_DEFAULT_RADIUS_M. */
  radiusMeters?: number;
  /** Geometry field name on the dataset (e.g. "the_geom" for DataSF). */
  geometryField?: string;
  /** Raw SoQL $where clause (no leading "$where="). AND-ed onto any
   *  point query. */
  where?: string;
  /** Constant filter applied to every query against this dataset.
   *  E.g. `closed_roll_year='2024'` for SF Tax Rolls. AND-ed onto
   *  both point and where queries. */
  baseWhere?: string;
  /** $select clause. Default omitted (all columns). */
  select?: string;
  /** Max results. Default 1. */
  limit?: number;
}

/**
 * Run a SoQL query against a Socrata dataset.
 *
 * @param datasetUrl  Full dataset URL of the form
 *                    `https://data.<org>.gov/resource/<id>.json`
 * @param params      Query parameters; see SocrataQueryParams.
 *
 * Returns the parsed rows array on success; null on any failure
 * (network, non-200, structured error envelope, parse failure). The
 * caller decides what to do with empty results — for parcel lookups
 * an empty array is a coverage gap, not an error.
 */
export async function querySocrataDataset(
  datasetUrl: string,
  params: SocrataQueryParams,
): Promise<SocrataRow[] | null> {
  const url = buildSocrataUrl(datasetUrl, params);
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
        `[carbon-enrich] SOCRATA_NON_OK status=${res.status} url=${datasetUrl} body=${bodyPreview}`,
      );
      return null;
    }
    const rawBody = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(rawBody);
    } catch (e) {
      console.warn(
        `[carbon-enrich] SOCRATA_PARSE_FAIL url=${datasetUrl} body=${rawBody.slice(0, 200)} err=${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
    // Socrata error envelope: { message, errorCode, data } shape.
    if (data && typeof data === "object" && !Array.isArray(data) && "errorCode" in data) {
      const err = data as { errorCode?: string; message?: string };
      console.warn(
        `[carbon-enrich] SOCRATA_QUERY_ERROR url=${datasetUrl} code=${err.errorCode} msg=${String(err.message ?? "").slice(0, 200)}`,
      );
      return null;
    }
    if (!Array.isArray(data)) {
      console.warn(
        `[carbon-enrich] SOCRATA_BAD_SHAPE url=${datasetUrl} body=${rawBody.slice(0, 200)}`,
      );
      return null;
    }
    const rows = data as SocrataRow[];
    if (rows.length === 0) {
      console.warn(
        `[carbon-enrich] SOCRATA_EMPTY url=${datasetUrl} params=${JSON.stringify({ ...params, point: params.point ? "[...]" : undefined })}`,
      );
    }
    return rows;
  } catch (e) {
    console.warn(
      `[carbon-enrich] SOCRATA_THROW url=${datasetUrl} err=${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}

/** Compose a Socrata SoQL URL from a dataset URL + our normalized
 *  params. Exported for tests. */
export function buildSocrataUrl(
  datasetUrl: string,
  params: SocrataQueryParams,
): string {
  const usp = new URLSearchParams();

  const wheres: string[] = [];
  if (params.point) {
    const field = params.geometryField ?? "the_geom";
    const meters = params.radiusMeters ?? SOCRATA_DEFAULT_RADIUS_M;
    wheres.push(`within_circle(${field},${params.point.lat},${params.point.lon},${meters})`);
  }
  if (params.where) wheres.push(`(${params.where})`);
  if (params.baseWhere) wheres.push(`(${params.baseWhere})`);

  if (wheres.length) usp.set("$where", wheres.join(" AND "));
  if (params.select) usp.set("$select", params.select);
  usp.set("$limit", String(params.limit ?? 1));

  return `${datasetUrl}?${usp.toString()}`;
}
