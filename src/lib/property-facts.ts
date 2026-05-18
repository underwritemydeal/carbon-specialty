/**
 * PropertyFacts — sprint C.S.1.6 / extended in C.S.1.7.0a.
 *
 * Shared response shape for /api/property/enrich. The enrichment route
 * composes data from upstreams (Google Geocoding, Realie Property
 * Data, county-direct ArcGIS FeatureServers, Google Street View Static
 * URL builder) into this single object, gracefully degrading when any
 * upstream is unavailable.
 *
 * `sources_succeeded` and `sources_failed` are always present so callers
 * (the chat tool handler) can decide how to phrase the confirmation
 * back to the user without inferring success from missing fields.
 *
 * Two shapes coexist for backwards compatibility:
 *
 *   Flat fields (legacy, C.S.1.6 → C.S.1.6.8): `year_built`,
 *   `square_feet`, `units`, `land_use_desc`, `owner_of_record`, etc.
 *   These remain populated regardless of which upstream returned the
 *   data — the C.S.1.7.0a county-direct path flattens its grouped
 *   record back into these top-level fields so chat-tools.ts and the
 *   CARBON_INTAKE_SYSTEM_PROMPT enrichment-lead behavior keep working
 *   without changes.
 *
 *   Grouped sections (C.S.1.7.0a, new): `building`, `owner`,
 *   `transaction`. Populated when a county-direct source returns a
 *   full record. Sized for the future marketing-export use case
 *   without requiring a retrofit.
 *
 * Sources of truth & what each emits is documented per source:
 *
 *   geocoding  → canonical_address, lat, lng, structured address
 *                components used to route the parcel query
 *   realie     → flat fields (year_built, square_feet, land_use_*,
 *                owner_of_record, parcel_id)
 *   la-county  → grouped sections PLUS flat-field flatten. NO
 *                owner-data fields — LA Assessor policy omission;
 *                see CARBON_RESEARCH.md "Property data API landscape"
 *                for the owner-data gap and the marketing-export
 *                follow-up sprint that needs a separate source.
 *   streetview → street_view_url
 */

export type EnrichmentSource =
  | "geocoding"
  | "realie"
  // CA county-direct ArcGIS sources. C.S.1.7.0a added LA. C.S.1.7.0b
  // added SD, Riverside, OC. Slugs match the `slug` field on each
  // CACountyConfig entry in src/lib/ca-county-registry.ts.
  | "la-county"
  | "san-diego-county"
  | "orange-county"
  | "riverside-county"
  | "streetview";

/* =========================================================================
 * Grouped sections — C.S.1.7.0a
 * Every field optional. Counties may omit any field. Marketing export
 * reads from these directly; chat-tools.ts reads the flat fields.
 * ========================================================================= */

export interface BuildingFacts {
  /** Use-code identifier (e.g. LA's "0500" for Five-or-more apartments). */
  use_code?: string;
  /** Human-readable use description from the source registry. */
  use_desc?: string;
  /** Year primary structure was built. */
  year_built?: number;
  /** Building square footage. */
  building_sqft?: number;
  /** Lot square footage (polygon-derived where applicable). */
  lot_sqft?: number;
  /** Unit count. For multifamily, the apartment count. */
  units?: number;
  /** Number of stories. Often undefined — most CA assessors don't publish. */
  stories?: number;
  bedrooms?: number;
  bathrooms?: number;
  /** Construction / design type — quality + frame material varies by
   *  county. LA uses DesignType + QualityClass; Realie uses
   *  constructionType. */
  construction_type?: string;
}

/** Owner-related facts. Mostly undefined for CA counties — LA County
 *  and most CA counties don't publish owner name or mailing address
 *  via public ArcGIS. Marketing-export use case requires a separate
 *  owner-data source. See CARBON_RESEARCH.md. */
export interface OwnerFacts {
  name?: string;
  mailing_address?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  /** "homeowner-occupied" / "non-occupant" / "exempt". Inferred from
   *  the assessor's homeowner-exemption flag where published. */
  ownership_type?: string;
}

export interface TransactionFacts {
  /** ISO-format date string if available. Most CA assessors don't
   *  publish sale dates via public ArcGIS. */
  last_sale_date?: string;
  last_sale_price?: number;
  /** Assessed value = land + improvements. */
  assessed_value?: number;
  /** When non-zero, indicates a homeowner / institutional /
   *  agricultural exemption is on file. */
  tax_exempt?: number;
}

export type EnrichmentSourceTag = EnrichmentSource;

export interface PropertyFacts {
  /** The address as the user typed it (or the chat passed in). */
  query_address: string;

  /** Geocoded canonical form, e.g. "1247 Pine Ave, Long Beach, CA 90802, USA". */
  canonical_address?: string;
  lat?: number;
  lng?: number;

  /* ---- Flat fields (legacy, populated regardless of source) ---- */
  units?: number;
  year_built?: number;
  square_feet?: number;
  construction_type?: string;
  lot_size_sqft?: number;
  owner_of_record?: string;
  parcel_id?: string;

  /** Land-use classification. Source-agnostic (Realie's useCode +
   *  inline-mapped desc, or LA County's UseCode + UseDescription). */
  land_use_code?: string;
  land_use_desc?: string;

  /** Built client-side; no upstream call. Empty when GOOGLE_MAPS_API_KEY is unset. */
  street_view_url?: string;

  /* ---- Grouped sections (C.S.1.7.0a, populated by county-direct path) ---- */

  /** Building / structure facts. Populated by county-direct sources;
   *  the flat fields above are derived from this where present. */
  building?: BuildingFacts;
  /** Owner facts. Mostly undefined for CA — LA Assessor and most CA
   *  counties omit owner data from public ArcGIS by policy. */
  owner?: OwnerFacts;
  /** Transaction / valuation facts. Sale data is rarely public via
   *  ArcGIS; assessed values are. */
  transaction?: TransactionFacts;

  /** Source the grouped fields came from. Useful for the future
   *  marketing-export pipeline so we can audit per-record data
   *  lineage. */
  source_tag?: EnrichmentSourceTag;

  sources_succeeded: EnrichmentSource[];
  sources_failed: EnrichmentSource[];
}
