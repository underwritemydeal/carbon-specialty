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

  /** Built client-side; no upstream call. Empty when GOOGLE_MAPS_API_KEY is unset. */
  street_view_url?: string;

  sources_succeeded: EnrichmentSource[];
  sources_failed: EnrichmentSource[];
}
