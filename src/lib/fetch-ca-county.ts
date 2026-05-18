/**
 * CA-county direct parcel fetch — sprint C.S.1.7.0a.
 *
 * Wraps `arcgis-client` + `ca-county-registry` to produce a
 * normalized PropertyFacts subset for a given lat/lng + detected
 * county. The /api/property/enrich route calls this BEFORE Realie
 * for CA addresses; if it returns null (county not registered, or
 * no parcel within radius), the route falls back to Realie.
 *
 * Output: both grouped sections (building/owner/transaction) AND
 * the flat legacy fields. Chat-tools.ts and the CARBON_INTAKE_SYSTEM_
 * PROMPT enrichment-lead behavior reads the flat fields; future
 * marketing-export reads the grouped sections.
 *
 * Owner section: typically empty/undefined for CA. LA Assessor and
 * most CA counties don't publish owner data via public ArcGIS. The
 * registry models the fields anyway so subsequent sprints can wire
 * a separate owner-data source in without reshaping PropertyFacts.
 *
 * Silent-null on miss/error — matches the rest of the enrichment
 * pipeline.
 */

import { queryFeatureService } from "./arcgis-client";
import type { CACountyConfig } from "./ca-county-registry";
import { findCACounty } from "./ca-county-registry";
import type {
  BuildingFacts,
  OwnerFacts,
  PropertyFacts,
  TransactionFacts,
} from "./property-facts";

/** The subset of PropertyFacts this fetcher produces. The caller
 *  (`enrichAddress` in /api/property/enrich/route.ts) merges it into
 *  the larger facts object that also carries canonical_address /
 *  lat / lng / sources_* / street_view_url. */
export type CACountyFacts = Partial<
  Pick<
    PropertyFacts,
    | "units"
    | "year_built"
    | "square_feet"
    | "construction_type"
    | "lot_size_sqft"
    | "owner_of_record"
    | "parcel_id"
    | "land_use_code"
    | "land_use_desc"
    | "building"
    | "owner"
    | "transaction"
    | "source_tag"
  >
>;

/**
 * Fetch a CA county parcel for a given geocoded point.
 *
 * @param lat  WGS84 latitude (from Google Geocoding)
 * @param lon  WGS84 longitude (from Google Geocoding)
 * @param detectedCounty  county string from the geocoding address
 *                        component (e.g. "Los Angeles County"). When
 *                        omitted or unmapped, returns null.
 *
 * Returns null when:
 *   - the county isn't in the registry
 *   - the ArcGIS query failed (logged via arcgis-client diagnostics)
 *   - the ArcGIS query returned zero features (no parcel near the point)
 */
export async function fetchCACounty(
  lat: number,
  lon: number,
  detectedCounty: string | undefined,
): Promise<CACountyFacts | null> {
  const county = findCACounty(detectedCounty);
  if (!county) return null;

  const features = await queryFeatureService(county.featureServiceUrl, {
    point: { lat, lon },
    radiusMeters: county.defaultRadiusMeters,
    outFields: "*",
    resultRecordCount: 1,
  });
  if (!features || features.length === 0) return null;

  const attrs = features[0].attributes;
  return normalizeCountyFeature(attrs, county);
}

/* =========================================================================
 * Normalizer — translates a county's raw record into Carbon's
 * grouped + flat PropertyFacts subset.
 *
 * Defensive: every county field is optional in the registry, so
 * every extraction here checks `if (county.fields.X)` before
 * touching the record. Counties that omit a field stay undefined
 * in PropertyFacts.
 * ========================================================================= */

export function normalizeCountyFeature(
  attrs: Record<string, unknown>,
  county: CACountyConfig,
): CACountyFacts {
  const f = county.fields;
  const out: CACountyFacts = { source_tag: "la-county" };

  // ---- Building ---------------------------------------------------------
  const building: BuildingFacts = {};
  if (f.useCode) {
    const code = readString(attrs, f.useCode);
    if (code) building.use_code = code;
  }
  if (f.useDescField) {
    const desc = readString(attrs, f.useDescField);
    if (desc) building.use_desc = desc;
  }
  // Fall back to useCodeMap if the response didn't include a paired desc
  if (!building.use_desc && building.use_code && f.useCodeMap) {
    const mapped = f.useCodeMap[building.use_code];
    if (mapped) building.use_desc = mapped;
  }
  if (f.yearBuilt) {
    const y = readNumber(attrs, f.yearBuilt);
    if (y && y > 1700 && y < 2100) building.year_built = y;
  }
  if (f.buildingSqft) {
    const n = readNumber(attrs, f.buildingSqft);
    if (n && n > 0) building.building_sqft = n;
  }
  if (f.lotSqft) {
    const n = readNumber(attrs, f.lotSqft);
    if (n && n > 0) building.lot_sqft = Math.round(n);
  }
  if (f.units) {
    const n = readNumber(attrs, f.units);
    if (n && n > 0) building.units = n;
  }
  if (f.stories) {
    const n = readNumber(attrs, f.stories);
    if (n && n > 0) building.stories = n;
  }
  if (f.bedrooms) {
    const n = readNumber(attrs, f.bedrooms);
    if (n && n > 0) building.bedrooms = n;
  }
  if (f.bathrooms) {
    const n = readNumber(attrs, f.bathrooms);
    if (n && n > 0) building.bathrooms = n;
  }
  // construction_type: composite of constructionType + constructionQualityField
  const ctParts: string[] = [];
  if (f.constructionType) {
    const v = readString(attrs, f.constructionType);
    if (v) ctParts.push(v);
  }
  if (f.constructionQualityField) {
    const v = readString(attrs, f.constructionQualityField);
    if (v) ctParts.push(`quality ${v}`);
  }
  if (ctParts.length) building.construction_type = ctParts.join(" · ");
  if (hasAnyKey(building)) out.building = building;

  // ---- Owner ------------------------------------------------------------
  // Mostly undefined for CA — LA Assessor and most CA counties don't
  // publish owner name or mailing address via public ArcGIS. The fields
  // are modeled in the registry so a future owner-data source can fill
  // them without a registry-shape change.
  const owner: OwnerFacts = {};
  if (f.ownerName) {
    const v = readString(attrs, f.ownerName);
    if (v) owner.name = v;
  }
  if (f.mailingAddress) {
    const v = readString(attrs, f.mailingAddress);
    if (v) owner.mailing_address = v;
  }
  if (f.mailingCity) {
    const v = readString(attrs, f.mailingCity);
    if (v) owner.mailing_city = v;
  }
  if (f.mailingState) {
    const v = readString(attrs, f.mailingState);
    if (v) owner.mailing_state = v;
  }
  if (f.mailingZip) {
    const v = readString(attrs, f.mailingZip);
    if (v) owner.mailing_zip = v;
  }
  if (f.ownershipType) {
    const v = readString(attrs, f.ownershipType);
    if (v) owner.ownership_type = v;
  } else if (f.homeownerExemptionField) {
    // Indicator-only: non-zero exemption → owner-occupied.
    const v = readNumber(attrs, f.homeownerExemptionField);
    if (typeof v === "number") {
      owner.ownership_type = v > 0 ? "homeowner-occupied" : "non-occupant";
    }
  }
  if (hasAnyKey(owner)) out.owner = owner;

  // ---- Transaction ------------------------------------------------------
  const transaction: TransactionFacts = {};
  if (f.lastSaleDate) {
    const v = readString(attrs, f.lastSaleDate);
    if (v) transaction.last_sale_date = v;
  }
  if (f.lastSalePrice) {
    const v = readNumber(attrs, f.lastSalePrice);
    if (v && v > 0) transaction.last_sale_price = v;
  }
  // Assessed value: explicit field wins; else sum land + improvements
  if (f.assessedValueField) {
    const v = readNumber(attrs, f.assessedValueField);
    if (v && v > 0) transaction.assessed_value = v;
  } else if (f.assessedLandValueField || f.assessedImpValueField) {
    const land = f.assessedLandValueField ? readNumber(attrs, f.assessedLandValueField) ?? 0 : 0;
    const imp = f.assessedImpValueField ? readNumber(attrs, f.assessedImpValueField) ?? 0 : 0;
    const sum = land + imp;
    if (sum > 0) transaction.assessed_value = sum;
  }
  if (f.taxExempt) {
    const v = readNumber(attrs, f.taxExempt);
    if (typeof v === "number") transaction.tax_exempt = v;
  }
  if (hasAnyKey(transaction)) out.transaction = transaction;

  // ---- Parcel ID --------------------------------------------------------
  if (f.parcelId) {
    const v = readString(attrs, f.parcelId);
    if (v) out.parcel_id = v;
  }

  // ---- Flatten the groups into legacy fields (backwards compat) --------
  // chat-tools.ts and the CARBON_INTAKE_SYSTEM_PROMPT enrichment-lead
  // behavior both read the flat fields. Keep those populated so
  // existing consumers don't need to know about the grouped shape.
  if (out.building) {
    if (out.building.use_code) out.land_use_code = out.building.use_code;
    if (out.building.use_desc) out.land_use_desc = out.building.use_desc;
    if (out.building.year_built) out.year_built = out.building.year_built;
    if (out.building.building_sqft) out.square_feet = out.building.building_sqft;
    if (out.building.units) out.units = out.building.units;
    if (out.building.lot_sqft) out.lot_size_sqft = out.building.lot_sqft;
    if (out.building.construction_type) out.construction_type = out.building.construction_type;
  }
  if (out.owner?.name) out.owner_of_record = out.owner.name;

  return out;
}

/* =========================================================================
 * Helpers
 * ========================================================================= */

function readString(attrs: Record<string, unknown>, key: string): string | undefined {
  const v = attrs[key];
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof v === "number") return String(v);
  return undefined;
}

function readNumber(attrs: Record<string, unknown>, key: string): number | undefined {
  const v = attrs[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function hasAnyKey(obj: object): boolean {
  for (const k in obj) {
    if ((obj as Record<string, unknown>)[k] !== undefined) return true;
  }
  return false;
}
