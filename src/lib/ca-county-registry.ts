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

export interface CACountyFields {
  /** Address. Full-address field preferred when published. */
  address?: string;

  // Building
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
  /** Polygon-derived. ArcGIS exposes `Shape__Area` for polygon layers
   *  (in sqft when the layer's SRS is in feet). For SRSs in meters,
   *  callers convert. LA's parcels are published in NAD83 / California
   *  Albers (meters), but their `Shape__Area` attribute is in sqft per
   *  the assessor's published convention. */
  lotSqft?: string;
  units?: string;
  stories?: string;
  bedrooms?: string;
  bathrooms?: string;
  constructionType?: string;
  /** Optional supplementary construction-quality field (LA's
   *  `QualityClass1`). When present, concatenated with constructionType
   *  in the human-readable construction_type string. */
  constructionQualityField?: string;

  // Owner — usually undefined for CA per the privacy policy gap
  ownerName?: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  ownershipType?: string;
  /** Indicator field that resolves to ownership_type ("homeowner-
   *  occupied" / etc.) when published. LA's `Roll_HomeOwnersExemp`
   *  non-zero → owner-occupied. */
  homeownerExemptionField?: string;

  // Transaction
  lastSaleDate?: string;
  lastSalePrice?: string;
  /** When published as two separate land + improvement fields, the
   *  registry can declare both and the normalizer sums them. LA
   *  publishes `Roll_LandValue` + `Roll_ImpValue`. */
  assessedValueField?: string;
  assessedLandValueField?: string;
  assessedImpValueField?: string;
  taxExempt?: string;

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

    // Building
    useCode: "UseCode",
    useDescField: "UseDescription",
    yearBuilt: "YearBuilt1",
    buildingSqft: "SQFTmain1",
    lotSqft: "Shape__Area",
    units: "Units1",
    bedrooms: "Bedrooms1",
    bathrooms: "Bathrooms1",
    constructionType: "DesignType1",
    constructionQualityField: "QualityClass1",
    // stories: undefined — LA doesn't publish

    // Owner — ALL undefined. LA Assessor policy: owner name +
    // mailing address are only available via the per-parcel
    // captcha-protected portal lookup, not public ArcGIS or bulk
    // data download.
    ownerName: undefined,
    mailingAddress: undefined,
    mailingCity: undefined,
    mailingState: undefined,
    mailingZip: undefined,
    homeownerExemptionField: "Roll_HomeOwnersExemp",

    // Transaction / valuation
    // LA splits assessed value into land + improvements; the
    // normalizer sums them.
    assessedLandValueField: "Roll_LandValue",
    assessedImpValueField: "Roll_ImpValue",
    taxExempt: "Roll_HomeOwnersExemp",
    // lastSaleDate / lastSalePrice undefined — LA doesn't publish

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
    // Building
    useCode: "nucleus_use_cd",
    useCodeMap: {
      // Common SanGIS nucleus_use_cd codes — minimal pass-through map.
      // Sourced from observed records + SanGIS documentation. Unmapped
      // codes fall through to "Use code XXX" so Carbon's prompt can
      // still confirm the raw code with the user.
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
    lotSqft: "SHAPE__Area",
    units: "unitqty",
    bedrooms: "bedrooms",
    bathrooms: "baths",
    // No constructionType — SD doesn't publish a frame/quality field

    // Owner — name/mailing unpublished per the CA privacy gap.
    // ownerocc is a "Y"/"N" string indicator; we map it via
    // homeownerExemptionField semantically (non-empty = inferred).
    // No dedicated handler, so leave undefined for now.
    ownerName: undefined,
    mailingAddress: undefined,
    // No homeownerExemptionField — SD's ownerocc is a string flag we
    // don't have a readNumber path for. Leave the owner section sparse.

    // Transaction
    // SD already sums land + improvements into asr_total — use it.
    assessedValueField: "asr_total",
    // No lastSaleDate / lastSalePrice published in this layer.

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

    // Building
    useCode: "GPLU_CODE",
    useDescField: "GPLU_DESC",
    lotSqft: "Shape__Area",
    // No yearBuilt, buildingSqft, units, bedrooms, bathrooms,
    // constructionType — not published on this layer.

    // Owner — OC publishes mailing address; name still unpublished.
    mailingAddress: "MailAddress",

    // Transaction
    assessedLandValueField: "LandVal",
    assessedImpValueField: "ImprovedVal",

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

    // Building
    // Riverside's CLASS_CODE is a string like "Bank" or "Apartments"
    // — already human-readable. Map directly to land_use_desc via
    // the useDescField mechanism. land_use_code stays undefined.
    useDescField: "CLASS_CODE",
    lotSqft: "SHAPE.STArea()",
    // No yearBuilt / buildingSqft / units / bedrooms / bathrooms /
    // constructionType — those live in the joined CREST_PROPERTY_CHAR
    // table that this single-query path doesn't reach.

    // Owner — Riverside is the first CA county to publish mailing
    // address via public ArcGIS. ownerName still unpublished (would
    // require the separate CREST_GENERAL table).
    mailingAddress: "MAIL_STREET",
    mailingCity: "MAIL_CITY", // encodes "city state zip" combined; see header

    // Transaction — Riverside splits assessed value into LAND +
    // STRUCTURES. Normalizer sums them.
    assessedLandValueField: "LAND",
    assessedImpValueField: "STRUCTURES",

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
