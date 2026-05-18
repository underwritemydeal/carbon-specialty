import { NextResponse } from "next/server";
import type { PropertyFacts, EnrichmentSource } from "@/lib/property-facts";

export const runtime = "nodejs";

/**
 * /api/property/enrich — sprint C.S.1.6.
 *
 * POST { address: string } → PropertyFacts.
 *
 * Composes three upstreams:
 *   1. Google Geocoding API     → canonical address + lat/lng
 *   2. Regrid Parcel API        → parcel facts (units, year built, sqft …)
 *   3. Google Street View URL   → just a URL string, no fetch
 *
 * Both real upstream fetches use Next.js' data cache with a 30-day
 * revalidate window (`next: { revalidate: 2592000 }`). Repeat lookups
 * for the same address inside the window hit the edge cache, no
 * upstream call.
 *
 * Partial-failure semantics: the response always includes
 * `sources_succeeded` + `sources_failed`. If at least one source
 * returns data, the route returns 200 with whatever it could gather.
 * Only when *every* source fails does the route return 502.
 *
 * Missing env vars (REGRID_API_TOKEN / GOOGLE_MAPS_API_KEY) are
 * treated as "this source unavailable" — the route still returns 200
 * with the relevant source listed under `sources_failed`. This is the
 * graceful-degradation rule from the sprint brief: callers (the chat
 * tool handler) read `sources_failed` and degrade their UX rather
 * than seeing a 5xx.
 */

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const address =
    body && typeof body === "object" && "address" in body
      ? String((body as { address?: unknown }).address ?? "").trim()
      : "";
  if (!address) {
    return NextResponse.json({ error: "missing address" }, { status: 400 });
  }

  const result = await enrichAddress(address);
  // 502 only when every source failed.
  if (
    result.sources_succeeded.length === 0 &&
    result.sources_failed.length > 0
  ) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result, { status: 200 });
}

/* =========================================================================
 * Composer
 * ========================================================================= */

export async function enrichAddress(address: string): Promise<PropertyFacts> {
  const succeeded: EnrichmentSource[] = [];
  const failed: EnrichmentSource[] = [];
  const facts: PropertyFacts = {
    query_address: address,
    sources_succeeded: succeeded,
    sources_failed: failed,
  };

  // ---- Geocoding ----------------------------------------------------------
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    const geo = await fetchGeocoding(address, googleKey);
    if (geo) {
      facts.canonical_address = geo.canonical_address;
      facts.lat = geo.lat;
      facts.lng = geo.lng;
      succeeded.push("geocoding");
    } else {
      failed.push("geocoding");
    }
  } else {
    failed.push("geocoding");
  }

  // ---- Regrid -------------------------------------------------------------
  // C.S.1.6.7 — Switched from address-based lookup
  // (`/api/v2/parcels/address?query=...`) to lat-lon point lookup
  // (`/api/v2/parcels/point?lat=...&lon=...`). The address endpoint
  // was returning 200 OK with empty features for every prod address
  // tested in C.S.1.6.6 (diagnosed via REGRID_EMPTY logging). Regrid
  // documents the point endpoint as the more reliable path when an
  // upstream geocoder is available — which Carbon has via Google
  // Geocoding earlier in this composer. We only attempt Regrid when
  // geocoding succeeded; otherwise mark regrid as failed since we
  // have no point to look up.
  const regridToken = process.env.REGRID_API_TOKEN;
  if (regridToken && typeof facts.lat === "number" && typeof facts.lng === "number") {
    const regrid = await fetchRegrid(facts.lat, facts.lng, regridToken);
    if (regrid) {
      Object.assign(facts, regrid);
      succeeded.push("regrid");
    } else {
      failed.push("regrid");
    }
  } else {
    failed.push("regrid");
  }

  // ---- Street View URL (synthetic) ----------------------------------------
  if (googleKey) {
    const subject = facts.canonical_address ?? address;
    facts.street_view_url = buildStreetViewUrl(subject, googleKey);
    succeeded.push("streetview");
  } else {
    failed.push("streetview");
  }

  return facts;
}

/* =========================================================================
 * Google Geocoding
 * ========================================================================= */

type GeocodingResult = {
  canonical_address: string;
  lat: number;
  lng: number;
};

interface GeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry?: { location?: { lat: number; lng: number } };
  }>;
}

export async function fetchGeocoding(
  address: string,
  apiKey: string,
): Promise<GeocodingResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  try {
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) return null;
    const data = (await res.json()) as GeocodingResponse;
    if (data.status !== "OK" || !data.results?.length) return null;
    const top = data.results[0];
    const loc = top.geometry?.location;
    if (!loc) return null;
    return {
      canonical_address: top.formatted_address,
      lat: loc.lat,
      lng: loc.lng,
    };
  } catch {
    return null;
  }
}

/* =========================================================================
 * Regrid Parcel API
 * ========================================================================= */

type RegridFacts = Partial<
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
  >
>;

interface RegridResponse {
  parcels?: {
    features?: Array<{
      properties?: {
        fields?: Record<string, unknown>;
      };
    }>;
  };
}

const ACRES_TO_SQFT = 43560;

/** Default search radius (meters) around the geocoded point.
 *
 *  Started at 50m on the assumption a geocoded point would land
 *  inside the building's parcel polygon. C.S.1.6.7 prod probes
 *  returned REGRID_EMPTY for all three test addresses at 50m, so
 *  widened to 1000m. Google often returns a street-midpoint or
 *  driveway-edge centroid for residential addresses, which can be
 *  meaningfully off the parcel polygon; 1000m gives a 1km buffer
 *  and we still take limit=1, so we get the nearest parcel
 *  regardless. False-positive risk is low — even at 1000m, the
 *  nearest-by-distance parcel is essentially always the right one
 *  for a residential or small commercial address. */
export const REGRID_DEFAULT_RADIUS_M = 1000;

/**
 * Regrid Parcel API — lat/lon point lookup.
 *
 *   GET https://app.regrid.com/api/v2/parcels/point
 *     ?lat=<lat>&lon=<lon>&radius=<meters>&limit=1&token=<token>
 *
 * Switched from the address-based endpoint in C.S.1.6.7. The address
 * endpoint (`/api/v2/parcels/address?query=...`) was returning 200 OK
 * with empty features for every prod address tested — diagnosed via
 * the REGRID_EMPTY logging added in PR #18. Regrid documents the
 * point endpoint as the more reliable path when an upstream
 * geocoder is available; Carbon has lat/lng from Google Geocoding
 * earlier in this composer, so we thread it through here.
 *
 * Response shape is identical to the address endpoint
 * (`{ parcels: { features: [...] } }`), so the normalizer and the
 * RegridResponse type stay unchanged.
 *
 * Diagnostic logging from PR #18 is preserved at all three failure
 * branches. The token is REDACTED from logged URLs.
 */
export async function fetchRegrid(
  lat: number,
  lon: number,
  token: string,
  radiusMeters: number = REGRID_DEFAULT_RADIUS_M,
): Promise<RegridFacts | null> {
  const url = `https://app.regrid.com/api/v2/parcels/point?lat=${lat}&lon=${lon}&radius=${radiusMeters}&limit=1&token=${token}`;
  const redactedUrl = url.replace(token, "REDACTED");
  try {
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) {
      let bodyPreview = "";
      try {
        bodyPreview = (await res.text()).slice(0, 200);
      } catch {
        // ignore
      }
      console.warn(
        `[carbon-enrich] REGRID_NON_OK status=${res.status} url=${redactedUrl} body=${bodyPreview}`,
      );
      return null;
    }
    // Read once as text so we can both parse the JSON and log a
    // body preview on REGRID_EMPTY. Without this, the empty-features
    // case had no signal beyond `features=0`, and we couldn't tell
    // whether Regrid was emitting a "no coverage" body, an account-
    // scoped warning, or a quirky shape.
    const rawBody = await res.text();
    let data: RegridResponse;
    try {
      data = JSON.parse(rawBody) as RegridResponse;
    } catch (e) {
      console.warn(
        `[carbon-enrich] REGRID_PARSE_FAIL lat=${lat} lon=${lon} body=${rawBody.slice(0, 200)} err=${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
    const fields = data.parcels?.features?.[0]?.properties?.fields;
    if (!fields) {
      const featuresLen = data.parcels?.features?.length ?? 0;
      console.warn(
        `[carbon-enrich] REGRID_EMPTY features=${featuresLen} lat=${lat} lon=${lon} radius=${radiusMeters} body=${rawBody.slice(0, 300)}`,
      );
      return null;
    }
    return normalizeRegridFields(fields);
  } catch (e) {
    console.warn(
      `[carbon-enrich] REGRID_THROW lat=${lat} lon=${lon} err=${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}

/** Defensive translation from Regrid's wide schema to our small one. */
export function normalizeRegridFields(fields: Record<string, unknown>): RegridFacts {
  const out: RegridFacts = {};

  const yearBuilt = toNumber(fields.yearbuilt);
  if (yearBuilt && yearBuilt > 1700 && yearBuilt < 2100) out.year_built = yearBuilt;

  // Unit count — Regrid uses `numunits` on residential parcels; fall back
  // to `units` (some datasets) or `numresunit`.
  const units =
    toNumber(fields.numunits) ??
    toNumber(fields.units) ??
    toNumber(fields.numresunit);
  if (units && units > 0) out.units = units;

  // Square footage — building square footage. Regrid normalizes to
  // `bldg_sqft`; some datasets surface `sqft` or `improvval_sqft`.
  const sqft =
    toNumber(fields.bldg_sqft) ??
    toNumber(fields.sqft) ??
    toNumber(fields.gisbldgsqft);
  if (sqft && sqft > 0) out.square_feet = sqft;

  const construction = toString(fields.struct) ?? toString(fields.bldg_type);
  if (construction) out.construction_type = construction;

  // Lot size — Regrid surfaces lot acreage; convert to sqft.
  const acres = toNumber(fields.gisacre) ?? toNumber(fields.ll_gisacre);
  if (acres && acres > 0) out.lot_size_sqft = Math.round(acres * ACRES_TO_SQFT);

  const owner = toString(fields.owner) ?? toString(fields.ll_owner);
  if (owner) out.owner_of_record = owner;

  const parcelId = toString(fields.parcelnumb) ?? toString(fields.ll_uuid);
  if (parcelId) out.parcel_id = parcelId;

  // C.S.1.6.6 — Land use. Regrid surfaces both a raw jurisdiction
  // code (`usecode`) and a normalized description (`usedesc`). Some
  // datasets only carry the LBCS function variant. We capture both
  // when present so the chat tool can lead with the asset-type
  // inference instead of asking blind.
  const landUseCode = toString(fields.usecode) ?? toString(fields.lbcs_function);
  if (landUseCode) out.land_use_code = landUseCode;
  const landUseDesc =
    toString(fields.usedesc) ??
    toString(fields.lbcs_function_desc) ??
    toString(fields.zoning_description);
  if (landUseDesc) out.land_use_desc = landUseDesc;

  return out;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

/* =========================================================================
 * Street View Static URL — synthetic, no fetch
 * ========================================================================= */

export function buildStreetViewUrl(address: string, apiKey: string): string {
  const params = new URLSearchParams({
    size: "640x400",
    location: address,
    fov: "85",
    pitch: "5",
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}
