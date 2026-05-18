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
  const regridToken = process.env.REGRID_API_TOKEN;
  if (regridToken) {
    // Prefer the canonical address from Geocoding when we have it — Regrid
    // matches better against fully-qualified addresses.
    const lookup = facts.canonical_address ?? address;
    const regrid = await fetchRegrid(lookup, regridToken);
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

export async function fetchRegrid(
  address: string,
  token: string,
): Promise<RegridFacts | null> {
  // Regrid Parcel API — address lookup. Returns a parcel collection;
  // we take the top match.
  const url = `https://app.regrid.com/api/v2/parcels/address?query=${encodeURIComponent(address)}&limit=1&token=${token}`;
  try {
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) return null;
    const data = (await res.json()) as RegridResponse;
    const fields = data.parcels?.features?.[0]?.properties?.fields;
    if (!fields) return null;
    return normalizeRegridFields(fields);
  } catch {
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
