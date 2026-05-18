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

import type { ArcGISFeature } from "./arcgis-client";
import { queryFeatureService } from "./arcgis-client";
import type {
  CACountyConfig,
  CACountyTableJoinFields,
} from "./ca-county-registry";
import { findCACounty } from "./ca-county-registry";
import { sanityCheckConstruction } from "./construction-sanity";
import type {
  BuildingFacts,
  EnrichmentSource,
  OwnerFacts,
  PropertyFacts,
} from "./property-facts";
import { querySocrataDataset } from "./socrata-client";

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
/** Optional caller-supplied context for narrowing the parcel choice
 *  when the geometry query returns multiple candidates. C.S.1.7.0i
 *  added `streetNumber` after a production bug where Google geocoded
 *  "1266 Stanyan St SF" to a lat/lng closer to neighboring APN 1289070
 *  (1260 Stanyan, SFR, 1 unit) than to the real APN 1289068 (1266
 *  Stanyan, **18-unit Multi-Family Residential**). The 50m radius
 *  picked the nearest by geometry — wrong building. Address-number
 *  alignment fixes it. */
export interface FetchCACountyOptions {
  /** Street number from Google's address_components (e.g. "1266"). When
   *  set, parcel candidates whose published address field contains this
   *  token as a discrete word are preferred over geometrically-nearest
   *  alternatives. Falls back silently if no match found. */
  streetNumber?: string;
}

/** Widened search radius for the C.S.1.7.0i address-aware matching.
 *  200m comfortably catches a parcel whose geocode lands on the next
 *  building over (Stanyan case was ~150m). Cached, so the extra
 *  feature count is a one-time cost per unique geocode. */
const PARCEL_MATCH_RADIUS_M = 200;
const PARCEL_MATCH_CANDIDATES = 20;

export async function fetchCACounty(
  lat: number,
  lon: number,
  detectedCounty: string | undefined,
  options: FetchCACountyOptions = {},
): Promise<CACountyFacts | null> {
  const county = findCACounty(detectedCounty);
  if (!county) return null;

  // C.S.1.7.0d — dispatch on client type. ArcGIS counties (LA, SD,
  // OC, Riverside) take the original FeatureServer path. Socrata
  // counties (SF) take the SoQL path.
  if (county.client === "socrata") {
    return fetchSocrataCounty(lat, lon, county, options);
  }

  // C.S.1.7.0i — widen the geometry query so we can disambiguate by
  // street number when Google geocodes to a neighboring parcel.
  // resultRecordCount: 20 is generous for urban density; the address-
  // match picker below handles selecting the right candidate.
  const features = await queryFeatureService(county.featureServiceUrl, {
    point: { lat, lon },
    radiusMeters: PARCEL_MATCH_RADIUS_M,
    outFields: "*",
    resultRecordCount: PARCEL_MATCH_CANDIDATES,
  });
  if (!features || features.length === 0) return null;

  const pickedAttrs = pickBestCandidateByStreetNumber(
    features.map((f) => f.attributes),
    county.fields.address,
    options.streetNumber,
  );
  const attrs = pickedAttrs;
  const out = normalizeCountyFeature(attrs, county);

  // C.S.1.7.0c — optional second-query table join. Riverside is the
  // first county to use this. Silent-null on failure: primary data
  // still ships (graceful degradation).
  if (
    county.assessorTableJoinUrl &&
    county.assessorTableJoinKey &&
    county.tableJoinFields
  ) {
    const joined = await fetchAssessorTableJoin(attrs, county);
    if (joined) {
      mergeJoinedBuilding(out, joined);
    }
  }

  // C.S.1.7.0e — insurance-literate sanity check. Suppresses
  // physically-impossible construction codes (e.g. 13-story wood
  // frame in SF) before they reach the chat. Operates after the
  // table-join merge so the final stories + construction_type pair
  // is what gets evaluated.
  return sanityCheckConstruction(out);
}

/* =========================================================================
 * Socrata-client county fetcher — C.S.1.7.0d
 *
 * SoQL `within_circle(geometryField, lat, lon, distance)` query
 * against the dataset, AND-ed with the county's `baseWhere` (e.g.
 * SF Tax Rolls pinning to `closed_roll_year='2024'`). Returns the
 * first matching row through the same `normalizeCountyFeature`
 * translator — the field-mapping registry is source-agnostic, so
 * the Socrata field names (`year_property_built`, `property_area`,
 * etc.) work without per-source code paths beyond the dispatcher.
 *
 * No table-join branch — neither SF dataset nor any other Socrata-
 * client county on the roadmap requires the C.S.1.7.0c join pattern.
 * If one ever does, dispatch can extend here without touching the
 * ArcGIS path.
 * ========================================================================= */

async function fetchSocrataCounty(
  lat: number,
  lon: number,
  county: CACountyConfig,
  options: FetchCACountyOptions = {},
): Promise<CACountyFacts | null> {
  const cfg = county.socrata;
  if (!cfg) return null;

  // C.S.1.7.0i — widen radius + return 20 candidates so the
  // address-number picker can disambiguate (canonical case:
  // "1266 Stanyan St SF" geocoding lat/lng was closer to APN
  // 1289070 = 1260 Stanyan SFR than to APN 1289068 = 1266 Stanyan
  // 18-unit MRES).
  const rows = await querySocrataDataset(cfg.datasetUrl, {
    point: { lat, lon },
    radiusMeters: PARCEL_MATCH_RADIUS_M,
    geometryField: cfg.geometryField,
    baseWhere: cfg.baseWhere,
    limit: PARCEL_MATCH_CANDIDATES,
  });
  if (!rows || rows.length === 0) return null;

  const picked = pickBestCandidateByStreetNumber(
    rows,
    county.fields.address,
    options.streetNumber,
  );
  const out = normalizeCountyFeature(picked, county);
  // C.S.1.7.0e — sanity check (SF is the canonical target: 550
  // California Street codes "D" / Wood Frame on a 13-story office).
  return sanityCheckConstruction(out);
}

/* =========================================================================
 * Address-aware candidate picker — C.S.1.7.0i
 *
 * The geometry query alone is biased by Google's geocoder accuracy. For
 * dense urban blocks (canonical case: 1266 Stanyan SF) the geocoded
 * lat/lng can land on a neighboring parcel, and a 50m radius picks the
 * geometrically-nearest match over the address-correct one. We widen
 * the query to ~200m + 20 candidates, then prefer the candidate whose
 * published address field contains the user-typed street number as a
 * discrete token.
 *
 * Algorithm:
 *   1. If no streetNumber supplied or no addressField configured for
 *      this county, return the first (geometrically-nearest) candidate.
 *      Preserves pre-sprint behavior for callers that don't pass the
 *      number.
 *   2. Otherwise, scan candidates for one whose addressField value
 *      contains the street number as a whole-word token (word-boundary
 *      regex). Many county address fields have leading-zero padding
 *      ("0000 1266 STANYAN ST0000" for SF), so we use \b not exact eq.
 *   3. If no candidate matches, fall back to the first (nearest) —
 *      defensive: never crash a probe that worked pre-sprint just
 *      because the picker found no string-match (e.g. street_number
 *      missing from county field, hyphenated address ranges, etc.).
 * ========================================================================= */

export function pickBestCandidateByStreetNumber<
  T extends Record<string, unknown>,
>(
  candidates: T[],
  addressField: string | undefined,
  streetNumber: string | undefined,
): T {
  if (candidates.length === 0) {
    throw new Error("pickBestCandidateByStreetNumber: no candidates");
  }
  if (!streetNumber || !addressField) return candidates[0];

  // Word-boundary match. Escape any regex metachars in the number
  // (defensive — Google street numbers are typically digits but
  // hyphenated forms like "1266-A" are not unheard of).
  const escaped = streetNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`);

  for (const c of candidates) {
    const raw = c[addressField];
    if (typeof raw !== "string") continue;
    if (re.test(raw)) return c;
  }
  return candidates[0];
}

/* =========================================================================
 * Assessor table-join (C.S.1.7.0c)
 *
 * Second query against `assessorTableJoinUrl` filtered by the primary
 * record's join-key value. Aggregates multi-row responses (one parcel
 * may have many building rows — e.g. apartment complexes return
 * 13–22 rows in Riverside) into a single insurance-tuned BuildingFacts
 * subset.
 *
 * Aggregation strategy:
 *   year_built / effective_year_built → MIN (oldest = highest risk)
 *   building_sqft                     → SUM (total under-roof living area)
 *   stories                           → MAX (tallest)
 *   construction_type / roof_type     → MODE (most common across rows)
 *   bedrooms / bathrooms              → SUM (whole parcel total)
 *
 * `resultRecordCount: 100` caps multi-row responses at 100 buildings
 * per parcel. Two orders of magnitude above the largest live-probe
 * sample (22 rows for a 100+ unit Corona apartment complex); below the
 * default 1000 ArcGIS hard cap so we don't accidentally pull a 999-row
 * response if a malformed join hits.
 * ========================================================================= */

export async function fetchAssessorTableJoin(
  primaryAttrs: Record<string, unknown>,
  county: CACountyConfig,
): Promise<BuildingFacts | null> {
  if (
    !county.assessorTableJoinUrl ||
    !county.assessorTableJoinKey ||
    !county.tableJoinFields
  ) {
    return null;
  }

  const keyValRaw = primaryAttrs[county.assessorTableJoinKey];
  if (keyValRaw === undefined || keyValRaw === null) return null;
  const keyValStr = String(keyValRaw).trim();
  if (!keyValStr) return null;

  const foreignKey =
    county.assessorTableJoinForeignKey ?? county.assessorTableJoinKey;
  // Escape single quotes per SQL-92 (ArcGIS query dialect).
  const escaped = keyValStr.replace(/'/g, "''");

  const joinFeatures = await queryFeatureService(county.assessorTableJoinUrl, {
    where: `${foreignKey}='${escaped}'`,
    outFields: "*",
    resultRecordCount: 100,
  });
  if (!joinFeatures || joinFeatures.length === 0) return null;

  return aggregateJoinRows(joinFeatures, county.tableJoinFields);
}

/** Aggregate joined-table rows into a single insurance-tuned
 *  BuildingFacts subset. See header for the per-field strategy. */
export function aggregateJoinRows(
  features: ArcGISFeature[],
  fields: CACountyTableJoinFields,
): BuildingFacts | null {
  const years: number[] = [];
  const effYears: number[] = [];
  const storiesList: number[] = [];
  let sqftSum = 0;
  let sqftCount = 0;
  let bedSum = 0;
  let bedCount = 0;
  let bathSum = 0;
  let bathCount = 0;
  const ctCount = new Map<string, number>();
  const roofCount = new Map<string, number>();

  for (const f of features) {
    const a = f.attributes;
    if (fields.yearBuilt) {
      const y = readNumber(a, fields.yearBuilt);
      if (y && y > 1700 && y < 2100) years.push(y);
    }
    if (fields.effectiveYearBuilt) {
      const y = readNumber(a, fields.effectiveYearBuilt);
      if (y && y > 1700 && y < 2100) effYears.push(y);
    }
    if (fields.buildingSqft) {
      const n = readNumber(a, fields.buildingSqft);
      if (n && n > 0) {
        sqftSum += n;
        sqftCount++;
      }
    }
    if (fields.stories) {
      const n = readNumber(a, fields.stories);
      if (n && n > 0) storiesList.push(n);
    }
    if (fields.bedrooms) {
      const n = readNumber(a, fields.bedrooms);
      if (n && n > 0) {
        bedSum += n;
        bedCount++;
      }
    }
    if (fields.bathrooms) {
      const n = readNumber(a, fields.bathrooms);
      if (n && n > 0) {
        bathSum += n;
        bathCount++;
      }
    }
    if (fields.constructionType) {
      const v = readString(a, fields.constructionType);
      if (v) ctCount.set(v, (ctCount.get(v) ?? 0) + 1);
    }
    if (fields.roofType) {
      const v = readString(a, fields.roofType);
      if (v) roofCount.set(v, (roofCount.get(v) ?? 0) + 1);
    }
  }

  const building: BuildingFacts = {};
  if (years.length) building.year_built = Math.min(...years);
  if (effYears.length) building.effective_year_built = Math.min(...effYears);
  if (sqftCount) building.building_sqft = sqftSum;
  if (storiesList.length) building.stories = Math.max(...storiesList);
  if (bedCount) building.bedrooms = bedSum;
  if (bathCount) building.bathrooms = bathSum;
  if (ctCount.size) building.construction_type = mostCommon(ctCount);
  if (roofCount.size) building.roof_type = mostCommon(roofCount);

  return hasAnyKey(building) ? building : null;
}

/** Merge joined-table building data into the primary out object.
 *  Primary wins on conflict — joined values fill gaps the primary
 *  didn't populate. Re-flattens building-derived fields back to the
 *  top-level legacy fields so chat-tools.ts (which reads the flat
 *  shape) sees the joined data without changes. */
export function mergeJoinedBuilding(
  out: CACountyFacts,
  joined: BuildingFacts,
): void {
  out.building = { ...joined, ...(out.building ?? {}) };
  // Re-flatten the merged building to the legacy top-level fields.
  // Don't overwrite fields the primary already populated.
  if (out.building.year_built && !out.year_built) {
    out.year_built = out.building.year_built;
  }
  if (out.building.building_sqft && !out.square_feet) {
    out.square_feet = out.building.building_sqft;
  }
  if (out.building.units && !out.units) {
    out.units = out.building.units;
  }
  if (out.building.construction_type && !out.construction_type) {
    out.construction_type = out.building.construction_type;
  }
}

function mostCommon<K>(counts: Map<K, number>): K {
  let best: K | undefined;
  let bestCount = -1;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  // counts.size > 0 is the precondition — caller checks before invoking.
  return best as K;
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
  // construction_type: composite of constructionType + constructionQualityField.
  // C.S.1.7.0d — when a `constructionTypeMap` is registered (SF uses
  // single-letter codes D/A/B/C/S → human-readable strings), the raw
  // code is translated first.
  // C.S.1.7.0f — when `constructionCodeKeyExtractor === "firstChar"`,
  // the raw code's leading character is the lookup key (LA's
  // QualityClass1 publishes composites like "D6B"/"AX" where the IBC
  // class is the leading letter and the trailing chars are quality
  // grade).
  const ctParts: string[] = [];
  if (f.constructionType) {
    const v = readString(attrs, f.constructionType);
    if (v) {
      const key =
        f.constructionCodeKeyExtractor === "firstChar"
          ? v.charAt(0).toUpperCase()
          : v;
      const mapped = f.constructionTypeMap?.[key];
      ctParts.push(mapped ?? v);
    }
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
