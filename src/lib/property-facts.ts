/**
 * PropertyFacts — sprint C.S.1.6.
 *
 * Shared response shape for /api/property/enrich. The enrichment route
 * composes data from three upstreams (Google Geocoding, Regrid Parcel
 * API, Google Street View Static URL builder) into this single object,
 * gracefully degrading when any upstream is unavailable.
 *
 * `sources_succeeded` and `sources_failed` are always present so callers
 * (the chat tool handler) can decide how to phrase the confirmation
 * back to the user without inferring success from missing fields.
 */

export type EnrichmentSource = "geocoding" | "regrid" | "streetview";

export interface PropertyFacts {
  /** The address as the user typed it (or the chat passed in). */
  query_address: string;

  /** Geocoded canonical form, e.g. "1247 Pine Ave, Long Beach, CA 90802, USA". */
  canonical_address?: string;
  lat?: number;
  lng?: number;

  /** Parcel facts from Regrid. All optional — Regrid coverage varies. */
  units?: number;
  year_built?: number;
  square_feet?: number;
  construction_type?: string;
  lot_size_sqft?: number;
  owner_of_record?: string;
  parcel_id?: string;

  /** Land-use classification. Sprint C.S.1.6.6 — added so Carbon can
   *  lead with asset-type inference instead of asking blind when
   *  Regrid returns parcel facts that already answer the question
   *  (e.g. single-family residential → "Are you renting it out?",
   *  not "is this multifamily, mixed-use, or commercial?"). The
   *  desc is the human-readable string (e.g. "Single Family
   *  Residential"); the code is the raw numeric/string identifier
   *  (e.g. "1100", varies by jurisdiction). */
  land_use_code?: string;
  land_use_desc?: string;

  /** Built client-side; no upstream call. Empty when GOOGLE_MAPS_API_KEY is unset. */
  street_view_url?: string;

  sources_succeeded: EnrichmentSource[];
  sources_failed: EnrichmentSource[];
}
