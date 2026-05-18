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
  EnrichmentSource,
  OwnerFacts,
  PropertyFacts,
} from "./property-facts";

/** The subset of PropertyFacts this fetcher produces. The caller
 *  (`enrichAddress` in /api/property/enrich/route.ts) merges it into
 *  the larger facts object that also carries canonical_address /
 *  lat / lng / sources_* / street_view_url.
 *
 *  C.S.1.7.0b — `lot_size_sqft` and `transaction` removed from the
 *  pickable set. The insurance-tuning sprint reclassified lot/sale/
 *  assessed-value/tax-exempt fields as out-of-scope. */
export type CACountyFacts = Partial<
  Pick<
    PropertyFacts,
    | "units"
    | "year_built"
    | "square_feet"
    | "construction_type"
    | "owner_of_record"
    | "parcel_id"
    | "land_use_code"
    | "land_use_desc"
    | "building"
    | "owner"
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
  // C.S.1.7.0b — source_tag is now driven by the registry's `slug`
  // (was hardcoded "la-county" in C.S.1.7.0a). Adding a county no
  // longer touches fetch-ca-county.ts; the registry slug becomes the
  // source tag automatically.
  const out: CACountyFacts = { source_tag: county.slug as EnrichmentSource };

  // ---- Building (CRITICAL + USEFUL) ------------------------------------
  // Insurance-tuned scope: capture what an underwriter needs to price
  // the schedule. Lot sqft, assessed value, sale data, and tax-exempt
  // indicators are not on this list — see CACountyFields header.
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
  if (f.effectiveYearBuilt) {
    const y = readNumber(attrs, f.effectiveYearBuilt);
    if (y && y > 1700 && y < 2100) building.effective_year_built = y;
  }
  if (f.buildingSqft) {
    const n = readNumber(attrs, f.buildingSqft);
    if (n && n > 0) building.building_sqft = n;
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
  // Sprinklered / roofType — registered USEFUL fields. No current CA
  // county publishes these; the readers are here so a future
  // inspection-data source can light them up.
  if (f.sprinkleredField) {
    const v = readString(attrs, f.sprinkleredField);
    if (v) {
      // Truthy string → true; explicit "no"/"n"/"false"/"0" → false.
      const low = v.toLowerCase();
      if (["n", "no", "false", "0"].includes(low)) building.sprinklered = false;
      else if (["y", "yes", "true", "1"].includes(low)) building.sprinklered = true;
    }
  }
  if (f.roofTypeField) {
    const v = readString(attrs, f.roofTypeField);
    if (v) building.roof_type = v;
  }
  if (hasAnyKey(building)) out.building = building;

  // ---- Owner (marketing-export reference, not Carbon chat) ------------
  // Mostly undefined for CA — LA + SD don't publish owner data;
  // Orange + Riverside publish mailing address only. Carbon's chat
  // doesn't surface these; they're staged for the future
  // marketing-export sprint that adds a separate owner-data source
  // for owner names.
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
  if (hasAnyKey(owner)) out.owner = owner;

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
    if (out.building.construction_type) out.construction_type = out.building.construction_type;
    // lot_size_sqft removed in C.S.1.7.0b insurance tuning
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
