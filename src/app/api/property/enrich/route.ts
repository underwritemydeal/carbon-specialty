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
 *   2. Realie Property Data API → parcel facts (year built, sqft, useCode …)
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
 * Missing env vars (REALIE_API_TOKEN / GOOGLE_MAPS_API_KEY) are
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
  let geo: GeocodingResult | null = null;
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    geo = await fetchGeocoding(address, googleKey);
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

  // ---- Realie -------------------------------------------------------------
  // C.S.1.6.8 — Replaced Regrid with Realie. Regrid Self-Serve started
  // at ~$500/mo and didn't fit Carbon's ~25–200 quotes/month early-
  // stage volume; Realie's free tier (25 req/mo + $0.15/overage) does.
  // Realie's Address Lookup is the simplest match for our use case:
  //   GET https://app.realie.ai/api/public/property/address/
  //       ?state=<XX>&address=<street line 1>[&city=&county=]
  //   Authorization: <api-key>           (raw key, no Bearer prefix)
  //
  // The endpoint requires structured `state` + `address` (street line
  // 1 only) as separate query params, not a single concatenated
  // string — so we still depend on Google Geocoding completing first
  // to parse the address_components into street/state/city/county.
  // Without geocoding we can't reliably call Realie, so we skip it.
  const realieToken = process.env.REALIE_API_TOKEN;
  if (realieToken && geo?.street_line && geo?.state) {
    const realie = await fetchRealie(
      geo.street_line,
      geo.state,
      realieToken,
      { city: geo.city, county: geo.county },
    );
    if (realie) {
      Object.assign(facts, realie);
      succeeded.push("realie");
    } else {
      failed.push("realie");
    }
  } else {
    failed.push("realie");
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
  /** C.S.1.6.8 — structured address components from
   *  Google's `address_components` array. Required to call Realie's
   *  Address Lookup, which takes `state` + `address` (street line 1)
   *  as separate query params, not a single concatenated string. */
  street_line?: string;
  city?: string;
  state?: string;
  county?: string;
  postal_code?: string;
};

interface GeocodingAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry?: { location?: { lat: number; lng: number } };
    address_components?: GeocodingAddressComponent[];
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

    const components = top.address_components ?? [];
    const findComponent = (type: string, key: "short_name" | "long_name" = "long_name") =>
      components.find((c) => c.types.includes(type))?.[key];

    const streetNumber = findComponent("street_number");
    // C.S.1.6.8 hot-fix — use `short_name` for the route so we get
    // the abbreviated form Realie indexes on ("E Edgemont Ave" not
    // "East Edgemont Avenue"). Realie's docs example shows the short
    // form, and prod probes confirmed 404 with the long form for all
    // three test addresses (Phoenix / Long Beach / Brooklyn). Switching
    // to short_name picks up the abbreviation that Realie's address
    // matcher expects.
    const route = findComponent("route", "short_name");
    const street_line = [streetNumber, route].filter(Boolean).join(" ") || undefined;

    return {
      canonical_address: top.formatted_address,
      lat: loc.lat,
      lng: loc.lng,
      street_line,
      city: findComponent("locality") ?? findComponent("sublocality"),
      state: findComponent("administrative_area_level_1", "short_name"),
      county: findComponent("administrative_area_level_2"),
      postal_code: findComponent("postal_code"),
    };
  } catch {
    return null;
  }
}

/* =========================================================================
 * Realie Property Data API (C.S.1.6.8 — replaced Regrid)
 * ========================================================================= */

type RealieFacts = Partial<
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

/** Realie returns the property facts under a single `property` object
 *  with all features at the top level (e.g. `property.yearBuilt`).
 *  Unknown fields are common — coverage varies by jurisdiction. We
 *  treat the whole object as Record<string, unknown> and let the
 *  normalizer cherry-pick. */
interface RealieResponse {
  property?: Record<string, unknown>;
}

const ACRES_TO_SQFT = 43560;

/** useCode → land_use_desc map. Realie's `useCode` is a 4-digit
 *  numeric string; the docs publish the canonical description for
 *  each code but the API doesn't return the description alongside the
 *  code. We inline the codes Carbon is most likely to see, grouped
 *  by asset class, so the C.S.1.6.6 enrichment-lead prompt has a
 *  human-readable string to lead with. Unmapped codes fall through
 *  to `Use code <code>` so Carbon can still confirm in dialog. */
const REALIE_USE_CODE_DESC: Record<string, string> = {
  // Residential — single unit
  "1001": "Single Family Residential",
  "1004": "Condominium Unit",
  "1006": "Mobile/Manufactured Home",
  // Residential — multi unit
  "1100": "Multifamily Residential",
  "1101": "Duplex (2 Units)",
  "1104": "Apartment House (5+ Units)",
  "1110": "Multifamily Dwellings",
  // Commercial
  "2000": "Commercial",
  "2001": "Retail Store",
  "2003": "Store/Office (Mixed Use)",
  "2012": "Restaurant",
  "2042": "Retail/Residential (Mixed Use)",
  // Office
  "3000": "Commercial Office",
  "3003": "Office Building",
  "3010": "Commercial/Industrial (Mixed Use)",
  // Industrial
  "5000": "Industrial",
  "6000": "Heavy Industrial",
  // Vacant / under construction
  "8000": "Vacant Land",
  "8014": "Under Construction",
  // General / fallback
  "0010": "Miscellaneous",
};

/**
 * Realie Property Data API — Address Lookup.
 *
 *   GET https://app.realie.ai/api/public/property/address/
 *     ?state=<XX>&address=<street line 1>[&city=&county=]
 *   Authorization: <api-key>    (raw key, NO "Bearer " prefix)
 *
 * Source (verified pre-swap):
 *   https://docs.realie.ai/api-reference/property/address-lookup
 *
 * Realie requires `state` + `address` as separate query params,
 * where `address` is street line 1 only ("1418 E Edgemont Ave"),
 * NOT a concatenated string. Caller is responsible for parsing
 * those out — in practice, from Google Geocoding's
 * `address_components` earlier in this composer. `city` + `county`
 * are optional but must be paired (city requires county per
 * Realie's spec).
 *
 * Diagnostic logging follows the same `[carbon-enrich]` prefix
 * pattern Regrid carried before this swap — REALIE_NON_OK,
 * REALIE_EMPTY (200 with no property object), REALIE_PARSE_FAIL,
 * REALIE_THROW. Token is REDACTED from logged URLs.
 */
export async function fetchRealie(
  street_line: string,
  state: string,
  token: string,
  optional: { city?: string; county?: string } = {},
): Promise<RealieFacts | null> {
  const params = new URLSearchParams({
    state,
    address: street_line,
  });
  // `city` is only accepted alongside `county` per Realie's spec.
  // Send both or neither.
  if (optional.city && optional.county) {
    params.set("city", optional.city);
    params.set("county", optional.county);
  }
  const url = `https://app.realie.ai/api/public/property/address/?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: token },
      next: { revalidate: 2592000 },
    });
    if (!res.ok) {
      let bodyPreview = "";
      try {
        bodyPreview = (await res.text()).slice(0, 200);
      } catch {
        // ignore
      }
      console.warn(
        `[carbon-enrich] REALIE_NON_OK status=${res.status} url=${url} body=${bodyPreview}`,
      );
      return null;
    }
    const rawBody = await res.text();
    let data: RealieResponse;
    try {
      data = JSON.parse(rawBody) as RealieResponse;
    } catch (e) {
      console.warn(
        `[carbon-enrich] REALIE_PARSE_FAIL state=${state} address=${street_line.slice(0, 80)} body=${rawBody.slice(0, 200)} err=${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
    const property = data.property;
    if (!property || typeof property !== "object") {
      console.warn(
        `[carbon-enrich] REALIE_EMPTY state=${state} address=${street_line.slice(0, 80)} body=${rawBody.slice(0, 300)}`,
      );
      return null;
    }
    return normalizeRealieFields(property);
  } catch (e) {
    console.warn(
      `[carbon-enrich] REALIE_THROW state=${state} address=${street_line.slice(0, 80)} err=${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}

/** Translate Realie's flat `property` object into our PropertyFacts
 *  subset. Fields documented at
 *  https://docs.realie.ai/api-reference/property-data-schema
 *  Notes:
 *  - `landArea` is already in square feet (different from Regrid's
 *    acres). Convert from `acres` only as a fallback.
 *  - `useCode` is a numeric string code; the mapping to a human-
 *    readable description is published in Realie's docs but NOT
 *    returned by the API. We inline the most-relevant subset
 *    above (REALIE_USE_CODE_DESC). Unmapped codes fall through.
 *  - Realie does not document a discrete unit-count field; if the
 *    operator confirms one exists at the feature level, fill it in
 *    here. For now we leave `units` unmapped and let Carbon's prompt
 *    derive multifamily-ness from the use code description.
 */
export function normalizeRealieFields(property: Record<string, unknown>): RealieFacts {
  const out: RealieFacts = {};

  const yearBuilt = toNumber(property.yearBuilt);
  if (yearBuilt && yearBuilt > 1700 && yearBuilt < 2100) out.year_built = yearBuilt;

  const sqft = toNumber(property.buildingArea);
  if (sqft && sqft > 0) out.square_feet = sqft;

  const construction = toString(property.constructionType);
  if (construction) out.construction_type = construction;

  // Lot size — Realie's `landArea` is already in sqft; fall back to
  // `acres` if `landArea` is absent.
  const landAreaSqft = toNumber(property.landArea);
  if (landAreaSqft && landAreaSqft > 0) {
    out.lot_size_sqft = Math.round(landAreaSqft);
  } else {
    const acres = toNumber(property.acres);
    if (acres && acres > 0) out.lot_size_sqft = Math.round(acres * ACRES_TO_SQFT);
  }

  const owner = toString(property.ownerName);
  if (owner) out.owner_of_record = owner;

  const parcelId = toString(property.parcelId);
  if (parcelId) out.parcel_id = parcelId;

  // Land use — code + inline description map.
  const code = toString(property.useCode);
  if (code) {
    out.land_use_code = code;
    out.land_use_desc = REALIE_USE_CODE_DESC[code] ?? `Use code ${code}`;
  }

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
