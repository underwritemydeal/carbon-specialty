/**
 * California county parcel-data registry — sprint C.S.1.7.0a.
 *
 * One config per CA county Carbon writes in. Pre-populated with LA
 * County only; subsequent sprints add Orange, San Diego, Riverside,
 * Alameda, etc. via the same shape.
 *
 * Field-mapping table per county. The keys are Carbon's normalized
 * field names; the values are the source-specific attribute names
 * the registry should read from each county's published record.
 * `undefined` means the county doesn't publish that field (omit
 * rather than guess — the brief was explicit on this).
 *
 * Owner fields are explicitly modeled but typically `undefined` in
 * CA — LA Assessor and most CA counties don't publish owner name or
 * mailing address through their public ArcGIS endpoints. The
 * marketing-export use case will need a separate owner-data source
 * (see CARBON_RESEARCH.md "Property data API landscape").
 *
 * `useCodeMap` is a per-county code → human-readable description
 * lookup. LA's API actually returns the description in `UseDescription`
 * alongside the code, so the map is provided as a fallback for any
 * code the API doesn't enrich with a description in the response.
 */

export type CountyClient = "arcgis" | "socrata";

/**
 * Insurance-tuned field mapping per county. C.S.1.7.0b dropped the
 * lot / transaction / tax-exempt families — those are appraisal +
 * marketing fields, not underwriting fields. What stays:
 *
 *   CRITICAL — capture if published:
 *     useCode + useCodeMap (or useDescField for already-readable codes)
 *     yearBuilt, buildingSqft, units, constructionType, stories
 *
 *   USEFUL — capture when published:
 *     effectiveYearBuilt (rehab year)
 *     sprinklered, roofType (rare — most CA assessors don't publish)
 *     bedrooms, bathrooms (SFR portfolio support)
 *
 *   DROP — do not capture even if the source publishes them:
 *     lotSqft / acreage / Shape__Area
 *     lastSaleDate / lastSalePrice
 *     assessedValue (land + improvement)
 *     taxExempt / homeowner-exemption indicators
 *
 * Owner-data fields are retained for the marketing-export use case
 * (Orange + Riverside publish mailing addresses). Carbon's chat
 * doesn't surface them; future marketing-export sprint uses them.
 */
export interface CACountyFields {
  /** Address. Full-address field preferred when published. */
  address?: string;

  // Building — CRITICAL
  useCode?: string;
  /** Optional inline lookup for the most common use codes. Counties
   *  that publish a paired description (LA does — `UseDescription`)
   *  may leave this empty and rely on the response. */
  useCodeMap?: Record<string, string>;
  /** Optional paired field that already contains the human-readable
   *  description for the useCode in the same record. LA County uses
   *  `UseDescription`. When present, this wins over `useCodeMap`. */
  useDescField?: string;
  yearBuilt?: string;
  buildingSqft?: string;
  units?: string;
  stories?: string;
  constructionType?: string;
  /** Optional supplementary construction-quality field (LA's
   *  `QualityClass1`). When present, concatenated with constructionType
   *  in the human-readable construction_type string. */
  constructionQualityField?: string;

  // Building — USEFUL
  /** Year of major rehab / effective age for valuation. LA's
   *  EffectiveYear1 is the source field where this exists. */
  effectiveYearBuilt?: string;
  /** Sprinklered indicator. Not published by any CA county in the
   *  current registry; field exists so a future inspection-data
   *  source can populate it. */
  sprinkleredField?: string;
  /** Roof type. Not published by any CA county in the current
   *  registry; field exists so a future inspection-data source can
   *  populate it. */
  roofTypeField?: string;
  bedrooms?: string;
  bathrooms?: string;

  // Owner — marketing-export reference (Carbon's chat doesn't read)
  ownerName?: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;

  // Parcel identifier
  parcelId?: string;
}

/**
 * Optional second-query table-join fields (sprint C.S.1.7.0c).
 *
 * Some CA counties split parcel geometry/identity from building
 * characteristics across two ArcGIS layers. Riverside is the first:
 *
 *   - PARCELS_CREST (MapServer/50)  — geometry + APN + CLASS_CODE +
 *                                     owner mailing
 *   - CREST_PROPERTY_CHAR (MapServer/80) — year_built, sqft, stories,
 *                                          construction_type, br/ba, roof
 *
 * The join is APN (primary) → PIN (joined). A parcel can have many
 * building rows in the joined table (large apartment complexes return
 * 13–22 rows). `fetchCACounty` aggregates those rows insurance-tuned:
 * year=MIN, sqft=SUM, stories=MAX, construction_type/roof=mode,
 * bedrooms/bathrooms=SUM.
 *
 * Insurance-tuned scope applies — same DROP list as the primary
 * registry. No lot size / assessed value / sale data even if the
 * joined table publishes them.
 *
 * Units is intentionally NOT mapped: CREST_PROPERTY_CHAR does NOT
 * publish a unit-count field at all. Riverside encodes unit ranges in
 * CLASS_CODE strings on the primary layer ("Apartment 21 - 40 Units")
 * — Carbon's chat reads the use_desc and asks the user for an exact
 * count when needed. */
export interface CACountyTableJoinFields {
  yearBuilt?: string;
  effectiveYearBuilt?: string;
  buildingSqft?: string;
  constructionType?: string;
  stories?: string;
  bedrooms?: string;
  bathrooms?: string;
  roofType?: string;
}

export interface CACountyConfig {
  /** Slug — used for logging + the EnrichmentSource tag. */
  slug: string;
  /** Display name (e.g. "Los Angeles County"). */
  county: string;
  state: "CA";
  client: CountyClient;
  /** Full URL of the ArcGIS layer (".../FeatureServer/<layerId>") or
   *  Socrata dataset endpoint, depending on `client`. */
  featureServiceUrl: string;
  /** Search radius (meters) for point queries. Override per-county
   *  if the default doesn't work. */
  defaultRadiusMeters?: number;
  fields: CACountyFields;

  /** C.S.1.7.0c — optional second-query table join URL. When set,
   *  `fetchCACounty` fires a second query against this layer after the
   *  primary query, using the primary record's join-key value, and
   *  merges the joined fields into PropertyFacts.building. */
  assessorTableJoinUrl?: string;
  /** Field in the PRIMARY record holding the join value (e.g. "APN"
   *  on Riverside's PARCELS_CREST). */
  assessorTableJoinKey?: string;
  /** Field name in the JOINED table that matches the primary key
   *  value. Defaults to `assessorTableJoinKey` when omitted (same
   *  field name on both layers). Riverside uses "PIN" on the joined
   *  table for the value that lives in "APN" on the primary. */
  assessorTableJoinForeignKey?: string;
  /** Field mapping for fields pulled from the joined table. Same
   *  insurance-tuned scope as the primary registry — no lot, no
   *  assessed value, no sale data even if the joined table publishes
   *  them. */
  tableJoinFields?: CACountyTableJoinFields;
}

/* =========================================================================
 * LA County
 * =========================================================================
 *
 * Layer: LA County Parcels (Esri hosted)
 *   https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/LA_County_Parcels/FeatureServer/0
 *
 * Schema verified via the /?f=json metadata probe (C.S.1.7.0a). LA
 * publishes up to 5 sub-buildings per parcel (YearBuilt1..5 etc.) —
 * we use the primary (`1`) for the chat enrichment lead; subsequent
 * sprints can surface the full schedule for multi-building parcels.
 *
 * Owner-data fields intentionally undefined — LA Assessor does not
 * publish ownerName/mailingAddress through public ArcGIS. Marketing-
 * export use case will need a separate source.
 * ========================================================================= */
export const LA_COUNTY: CACountyConfig = {
  slug: "la-county",
  county: "Los Angeles County",
  state: "CA",
  client: "arcgis",
  featureServiceUrl:
    "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/LA_County_Parcels/FeatureServer/0",
  defaultRadiusMeters: 50,
  fields: {
    // Address
    address: "SitusFullAddress",

    // Building — CRITICAL
    useCode: "UseCode",
    useDescField: "UseDescription",
    yearBuilt: "YearBuilt1",
    buildingSqft: "SQFTmain1",
    units: "Units1",
    constructionType: "DesignType1",
    constructionQualityField: "QualityClass1",
    // stories: LA doesn't publish — undefined

    // Building — USEFUL
    // C.S.1.7.0b — `EffectiveYear1` now mapped (LA publishes both
    // YearBuilt1 and EffectiveYear1; the effective year captures
    // major rehab). Drives more accurate insurance pricing on older
    // buildings that were gut-rehabbed.
    effectiveYearBuilt: "EffectiveYear1",
    bedrooms: "Bedrooms1",
    bathrooms: "Bathrooms1",
    // sprinkleredField / roofTypeField: LA doesn't publish

    // Owner — undefined. LA Assessor policy: owner name + mailing
    // address only via the per-parcel captcha-protected portal,
    // not public ArcGIS or bulk data download. Marketing-export
    // sprint will need a separate source.

    // (Lot sqft + assessed value + tax-exempt fields removed in
    //  C.S.1.7.0b — insurance-tuning DROP list.)

    // Parcel identifier
    parcelId: "APN",
  },
};

/* =========================================================================
 * San Diego County (added C.S.1.7.0b)
 * =========================================================================
 *
 * Layer: SANDAG Hosted Parcels FeatureServer
 *   https://geo.sandag.org/server/rest/services/Hosted/Parcels/FeatureServer/0
 *
 * SANDAG (San Diego Association of Governments) re-publishes the
 * County Assessor's Master Property Record + Parcel Assessment
 * Record as a single rich Feature Layer — 56 fields. Schema verified
 * via /?f=json + live geometry query against downtown SD (downtown
 * Broadway returned APN 5335730100, total_lvg_area 24,807 sqft,
 * asr_total $3.34M).
 *
 * Use codes: `nucleus_use_cd` is a 3-digit string code; the published
 * domain has 225 entries. We don't inline the full table — only what
 * we've confirmed shape-wise. Unmapped codes fall through to
 * "Use code XXX" via the normalizer's default. The map can grow over
 * time as Carbon sees real records.
 *
 * Owner-data: ownerocc field carries an owner-occupied indicator
 * ("Y"/"N"). Owner name + mailing address are NOT published — same
 * privacy gap as LA County. Future owner-data sprint addresses this
 * via a separate source.
 *
 * Sentinel values to filter: SANDAG uses "000" for missing bedroom /
 * bathroom counts and "00" for missing year_effective. The
 * normalizer's existing readNumber + > 0 + year-range guards handle
 * these correctly.
 * ========================================================================= */
export const SAN_DIEGO_COUNTY: CACountyConfig = {
  slug: "san-diego-county",
  county: "San Diego County",
  state: "CA",
  client: "arcgis",
  featureServiceUrl:
    "https://geo.sandag.org/server/rest/services/Hosted/Parcels/FeatureServer/0",
  defaultRadiusMeters: 50,
  fields: {
    // Building — CRITICAL
    useCode: "nucleus_use_cd",
    useCodeMap: {
      // Common SanGIS nucleus_use_cd codes — minimal pass-through map.
      // 225-entry SanGIS domain; future sprints expand as Carbon sees
      // real records.
      "110": "Single Family Residential",
      "120": "Mobile Home",
      "130": "Townhome / Condo",
      "210": "Apartments",
      "300": "Commercial",
      "400": "Office",
      "500": "Industrial",
      "700": "Agricultural",
      "800": "Vacant",
    },
    yearBuilt: "year_effective",
    buildingSqft: "total_lvg_area",
    units: "unitqty",
    // No constructionType — SD doesn't publish a frame/quality field

    // Building — USEFUL
    bedrooms: "bedrooms",
    bathrooms: "baths",

    // Owner — name/mailing unpublished per the CA privacy gap.

    // (Lot sqft + assessed value removed in C.S.1.7.0b — DROP list.)

    // Parcel identifier
    parcelId: "apn",
  },
};

/* =========================================================================
 * Orange County (added C.S.1.7.0b)
 * =========================================================================
 *
 * Layer: OC Public Works LegalLotsAttributeOpenData FeatureServer
 *   https://ocgis.com/arcpub/rest/services/LegalLotsAttributeOpenData/FeatureServer/0
 *
 * 27 fields. Decent coverage — has GPLU code + GPLU description
 * paired (so no inline use-code map needed), MailAddress, LandVal +
 * ImprovedVal. Notably absent: year_built, building_sqft, units,
 * bedrooms (those live in a different OC layer or aren't published
 * at all on the open-data side). For chat enrichment Carbon still
 * gets: address, use desc, lot area, assessed value, owner mailing.
 *
 * Live verification: queried downtown Santa Ana (SiteAddress "104 E
 * 1ST ST", LandVal 583,821, ImprovedVal 708,216).
 * ========================================================================= */
export const ORANGE_COUNTY: CACountyConfig = {
  slug: "orange-county",
  county: "Orange County",
  state: "CA",
  client: "arcgis",
  featureServiceUrl:
    "https://ocgis.com/arcpub/rest/services/LegalLotsAttributeOpenData/FeatureServer/0",
  defaultRadiusMeters: 50,
  fields: {
    address: "SiteAddress",

    // Building — CRITICAL (sparse on this layer)
    useCode: "GPLU_CODE",
    useDescField: "GPLU_DESC",
    // No yearBuilt / buildingSqft / units / bedrooms / bathrooms /
    // constructionType / stories — not published on this layer.
    // Chat asks user for these directly when the address is in OC.

    // Owner — OC publishes mailing address (marketing-export
    // reference). Owner name still unpublished.
    mailingAddress: "MailAddress",

    // (Lot sqft + assessed value removed in C.S.1.7.0b — DROP list.)

    // Parcel identifier
    parcelId: "AssessmentNo",
  },
};

/* =========================================================================
 * Riverside County (added C.S.1.7.0b)
 * =========================================================================
 *
 * Layer: Riverside County PARCELS_CREST (Assessor MapServer/50)
 *   https://gis.countyofriverside.us/arcgis_mapping/rest/services/OpenData/Assessor/MapServer/50
 *
 * 34 fields. PARCELS_CREST is one of two parcel-layer options:
 *
 *   - layer 40 (PARCELS): geometry + APN only. Skip.
 *   - layer 50 (PARCELS_CREST): geometry + 33 attribute fields. Use.
 *
 * C.S.1.7.0c — The richer parcel facts (year_built, building_sqft,
 * stories, construction_type, bedrooms, bathrooms, roof_type) live in
 * the joined CREST_PROPERTY_CHAR table (MapServer/80). The
 * `assessorTableJoinUrl` field below wires that second query. APN on
 * this layer joins to PIN on table 80 (same value, different field
 * name). Multi-row joins (large apartment complexes return up to
 * ~25 buildings) are aggregated insurance-tuned by `fetchCACounty`.
 *
 * Joined-table field-fill matrix per asset class (verified live):
 *
 *   | Field               | SFR | Apartment | Commercial |
 *   |---------------------|-----|-----------|------------|
 *   | YEAR_BUILT          |  ✓  |     ✓     |     ✓      |
 *   | LIVING_AREA (sqft)  |  ✓  |   ✗ null  |   ✗ null   |
 *   | NUMBER_OF_STORIES   |  ✓  |     ✓     |     ✓      |
 *   | CONSTRUCTION_TYPE   |  ✓  |     ✓     |     ✓      |
 *   | BEDROOM/BATH_COUNT  |  ✓  |   ✗ null  |   ✗ null   |
 *   | ROOF_TYPE           |  ✓  |  ✗ blank  |  ✗ blank   |
 *
 * Units is intentionally NOT mapped — CREST_PROPERTY_CHAR doesn't
 * publish a unit-count field. Apartment unit ranges live in the
 * primary layer's CLASS_CODE string ("Apartment 21 - 40 Units" /
 * "Apartment Over 100 Units"); Carbon's chat asks the user for an
 * exact count when needed.
 *
 * Two notable wins for Riverside vs LA:
 *   - CLASS_CODE is already human-readable ("Bank", "Single",
 *     "Apartments") instead of a numeric code. Maps directly to
 *     land_use_desc via the useDescField mechanism.
 *   - MAIL_STREET + MAIL_CITY publish owner mailing address (rare
 *     for CA). MAIL_CITY encodes "PALM DESERT CA 92260" — city,
 *     state, and zip combined into one field, so we can't split
 *     them cleanly into mailing_city + mailing_state + mailing_zip.
 *     For now MAIL_CITY goes to mailing_city verbatim; downstream
 *     consumers see the combined string.
 *
 * Live verification: queried 6570 Magnolia Ave Riverside (CLASS_CODE
 * "Bank", LAND $757K, STRUCTURES $4.26M).
 * ========================================================================= */
export const RIVERSIDE_COUNTY: CACountyConfig = {
  slug: "riverside-county",
  county: "Riverside County",
  state: "CA",
  client: "arcgis",
  featureServiceUrl:
    "https://gis.countyofriverside.us/arcgis_mapping/rest/services/OpenData/Assessor/MapServer/50",
  defaultRadiusMeters: 50,
  fields: {
    address: "SITUS_STREET",

    // Building — CRITICAL (sparse on this layer)
    // Riverside's CLASS_CODE is a string like "Bank" or "Apartments"
    // — already human-readable. Map directly to land_use_desc via
    // the useDescField mechanism. land_use_code stays undefined.
    useDescField: "CLASS_CODE",
    // No yearBuilt / buildingSqft / units / bedrooms / bathrooms /
    // constructionType / stories — those live in the joined
    // CREST_PROPERTY_CHAR table at MapServer/80 that this single-
    // query path doesn't reach. C.S.1.7.0c can extend CACountyConfig
    // with a table-join field if Carbon needs them.

    // Owner — first CA county in the registry to publish mailing
    // address via public ArcGIS (notable for the marketing-export
    // sprint that adds owner data sitewide). Owner name still
    // unpublished (joined CREST_GENERAL table).
    mailingAddress: "MAIL_STREET",
    mailingCity: "MAIL_CITY", // encodes "city state zip" combined; see header

    // (Lot sqft + assessed value removed in C.S.1.7.0b — DROP list.)

    // Parcel identifier
    parcelId: "APN",
  },

  // C.S.1.7.0c — second-query table join lights up the CRITICAL fields
  // (year_built, building_sqft, construction_type, stories) that the
  // primary layer doesn't publish. Same DROP-list scope as the primary
  // registry (no lot, no assessed value, no sale data).
  assessorTableJoinUrl:
    "https://gis.countyofriverside.us/arcgis_mapping/rest/services/OpenData/Assessor/MapServer/80",
  assessorTableJoinKey: "APN",
  // PIN on the joined table holds the same value as APN on the primary.
  assessorTableJoinForeignKey: "PIN",
  tableJoinFields: {
    yearBuilt: "YEAR_BUILT",
    buildingSqft: "LIVING_AREA",
    constructionType: "CONSTRUCTION_TYPE",
    stories: "NUMBER_OF_STORIES",
    bedrooms: "BEDROOM_COUNT",
    bathrooms: "BATH_COUNT",
    roofType: "ROOF_TYPE",
    // No `units` — CREST_PROPERTY_CHAR doesn't publish unit count.
    //   See CACountyTableJoinFields header.
    // No `effectiveYearBuilt` — same.
  },
};

/** All registered CA counties. Subsequent sprints append here. */
export const CA_COUNTIES: ReadonlyArray<CACountyConfig> = [
  LA_COUNTY,
  SAN_DIEGO_COUNTY,
  ORANGE_COUNTY,
  RIVERSIDE_COUNTY,
];

/** Lookup by county name. Accepts forms with/without "County" suffix
 *  (Google Geocoding's `administrative_area_level_2` returns
 *  "Los Angeles County"; some sources surface "Los Angeles"). */
export function findCACounty(countyName: string | undefined): CACountyConfig | null {
  if (!countyName) return null;
  const normalized = countyName.trim().replace(/\s+County$/i, "").toLowerCase();
  for (const c of CA_COUNTIES) {
    const countyNormalized = c.county.toLowerCase().replace(/\s+county$/i, "");
    if (countyNormalized === normalized) return c;
  }
  return null;
}
