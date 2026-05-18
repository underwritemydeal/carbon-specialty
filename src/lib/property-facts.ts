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
  // CA county-direct sources. C.S.1.7.0a added LA. C.S.1.7.0b added
  // SD, Riverside, OC. C.S.1.7.0d added SF (first Socrata-client
  // county). Slugs match the `slug` field on each CACountyConfig
  // entry in src/lib/ca-county-registry.ts.
  | "la-county"
  | "san-diego-county"
  | "orange-county"
  | "riverside-county"
  | "san-francisco-county"
  | "streetview";

/* =========================================================================
 * Grouped sections — C.S.1.7.0a (extended/tightened C.S.1.7.0b)
 *
 * Every field optional. Counties may omit any field.
 *
 * Insurance-tuned scope: building section carries the facts an
 * underwriter actually needs (sqft, units, year, effective year,
 * construction, stories, sprinklered, roof). Lot size + assessment
 * + sale data + tax-exempt indicators were dropped — those are
 * appraisal/marketing concerns, not insurance ones.
 *
 * Owner section retained for the future marketing-export use case.
 * Most CA counties don't publish owner name through public ArcGIS
 * (privacy policy); Orange + Riverside publish mailing address only.
 * Carbon's chat doesn't read these — they're staged for the
 * marketing-export sprint that adds a separate owner-data source.
 *
 * TransactionFacts removed in C.S.1.7.0b insurance tuning — every
 * field that lived there (assessed value, last sale, tax exempt)
 * was reclassified as DROP for the underwriting use case.
 * ========================================================================= */

export interface BuildingFacts {
  /** Use-code identifier (e.g. LA's "0500" for Five-or-more apartments). */
  use_code?: string;
  /** Human-readable use description from the source registry. */
  use_desc?: string;
  /** Year primary structure was built. CRITICAL for insurance pricing. */
  year_built?: number;
  /** Year of last major rehab / effective age for valuation. LA
   *  publishes this as EffectiveYear1 alongside YearBuilt1. USEFUL
   *  when present — closes the gap on heavily rehabbed older
   *  buildings that price like newer ones. */
  effective_year_built?: number;
  /** Building square footage. CRITICAL. */
  building_sqft?: number;
  /** Unit count. For multifamily, the apartment count. CRITICAL. */
  units?: number;
  /** Number of stories. CRITICAL but rarely published by CA
   *  assessors — typically undefined. */
  stories?: number;
  /** Bedrooms — USEFUL for SFR portfolios where bed count drives
   *  schedule entries. */
  bedrooms?: number;
  /** Bathrooms — USEFUL for SFR portfolios alongside bedrooms. */
  bathrooms?: number;
  /** Construction / design type. CRITICAL — drives carrier appetite
   *  + ISO class. LA uses DesignType + QualityClass composite;
   *  Realie uses constructionType. */
  construction_type?: string;
  /** Set by the C.S.1.7.0e sanity-check layer when the county-published
   *  construction code fails an IBC-physics check against the building's
   *  height (e.g. 12-story "Wood Frame" — physically impossible). When
   *  set, `construction_type` is cleared and chat asks the user for the
   *  actual construction type. Single value today; expandable to other
   *  reliability flags later. */
  constructionTypeFlag?: "unreliable_county_data";
  /** Sprinklered flag. USEFUL — affects fire-rate pricing. Not
   *  typically published by CA assessors; field exists so future
   *  inspection-data sources can fill it. */
  sprinklered?: boolean;
  /** Roof type. USEFUL — affects wind + hail pricing in some
   *  markets. Not typically published by CA assessors. */
  roof_type?: string;
}

/** Owner-related facts. Mostly undefined for CA counties — LA, SD
 *  don't publish owner name or mailing address via public ArcGIS by
 *  policy. Orange + Riverside (C.S.1.7.0b) publish mailing address
 *  only. Marketing-export use case requires a separate owner-data
 *  source for owner names sitewide; see CARBON_RESEARCH.md. */
export interface OwnerFacts {
  name?: string;
  mailing_address?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
}

export type EnrichmentSourceTag = EnrichmentSource;

export interface PropertyFacts {
  /** The address as the user typed it (or the chat passed in). */
  query_address: string;

  /** Geocoded canonical form, e.g. "1247 Pine Ave, Long Beach, CA 90802, USA". */
  canonical_address?: string;
  lat?: number;
  lng?: number;

  /* ---- Flat fields (legacy, populated regardless of source) ----
   *  lot_size_sqft removed in C.S.1.7.0b insurance tuning. */
  units?: number;
  year_built?: number;
  square_feet?: number;
  construction_type?: string;
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
  /** Owner facts. Mostly undefined for CA — LA + SD assessors omit
   *  owner data from public ArcGIS by policy. Orange + Riverside
   *  publish mailing address only (no name). Staged for the future
   *  marketing-export sprint. */
  owner?: OwnerFacts;
  // transaction?: TransactionFacts removed in C.S.1.7.0b — every
  // field that lived in it (assessed value, sale date, tax exempt)
  // is on the insurance-tuning DROP list.

  /** Source the grouped fields came from. Useful for the future
   *  marketing-export pipeline so we can audit per-record data
   *  lineage. */
  source_tag?: EnrichmentSourceTag;

  sources_succeeded: EnrichmentSource[];
  sources_failed: EnrichmentSource[];
}
