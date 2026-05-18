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

/** All registered CA counties. Subsequent sprints append here. */
export const CA_COUNTIES: ReadonlyArray<CACountyConfig> = [LA_COUNTY];

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
