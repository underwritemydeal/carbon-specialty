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
 * The richer parcel facts (year_built, building_sqft, unit count,
 * bedrooms, bathrooms) live in a separate CREST_PROPERTY_CHAR TABLE
 * (id 80) that would need a second APN-join query. That's beyond
 * this single-query registry's scope — a future sprint can extend
 * CACountyConfig with an `assessorTableJoinUrl` field if Carbon
 * needs the joined attributes.
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
