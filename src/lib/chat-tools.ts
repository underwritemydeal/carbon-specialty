/**
 * Chat tools — sprint C.S.1.6 / extended C.S.1.7.0k.
 *
 * Registry of tools the Anthropic Messages API can call when handling
 * the Carbon intake conversation. Two tools today:
 *
 *   enrich_property — server-executed lookup. The route hits an internal
 *                     HTTP endpoint (/api/property/enrich) and returns
 *                     the composed PropertyFacts as the tool result.
 *
 *   extract_intake  — model-only "tool". The model's `tool_use.input`
 *                     IS the structured CarbonIntakePayload. There is
 *                     no server-side execution — the route reads the
 *                     args directly off the message and returns. This
 *                     replaces the C.S.1.7.0j second-LLM-call extract
 *                     mode with a forced tool-use against a schema.
 *
 * The TOOLS export is the intake-mode tool list (enrich_property only —
 * extract_intake would only confuse the conversational flow). The
 * EXTRACT_TOOLS export is the extract-mode list (extract_intake only,
 * used with tool_choice to force structured output).
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { PropertyFacts } from "./property-facts";

export type ToolDefinition = Anthropic.Tool;

/** The intake-mode tool catalog. Passed to the model on every intake
 *  turn. `extract_intake` is deliberately NOT in this list — exposing
 *  it during intake would let the model end the conversation early. */
export const TOOLS: ToolDefinition[] = [
  {
    name: "enrich_property",
    description:
      "Look up confirmed facts about a US property — canonical address, year built, unit count, square footage, construction type, lot size, owner of record, parcel ID, and a Street View URL. Call this any time the user names a property address (full or partial), before continuing the conversation. Use the returned data to confirm the property back to the user in natural language.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description:
            "Property address. Can be partial or natural-language; the enrichment route canonicalizes it.",
        },
      },
      required: ["address"],
    },
  },
];

/* =========================================================================
 * extract_intake — C.S.1.7.1 habitational COPE structured-extraction tool
 *
 * The model is forced to call this exactly once with the structured
 * CarbonIntakePayload. The route reads `tool_use.input` and returns it
 * verbatim to the client; there is no server-side execution.
 *
 * Schema mirrors CarbonIntakePayload in src/lib/carbon-intake.ts and
 * the prose documentation in CARBON_EXTRACTION_SYSTEM_PROMPT. All
 * three must be updated together when the shape changes.
 *
 * C.S.1.7.1 changes from C.S.1.7.0k:
 *   - asset_class enum collapsed to 5 values (habitational only)
 *   - dropped coverage_scope, eq_interest, flood_interest
 *   - added square_footage, sprinklered, central_station_alarm,
 *     electrical_type, gross_annual_rents, expiring_premium_usd,
 *     loss_history_5yr (array of {year, type, approx_amount_usd}),
 *     flood_concern_volunteered, property_mgmt_disclosed,
 *     named_insured, consent, enrichment_confirmed
 *   - construction_type is populated from enrich_property, never user-asked
 *   - field renamed: asset_type → asset_class
 *   - field renamed: consent_to_share_with_markets → consent
 *   - location object removed (address lives in the transcript)
 * ========================================================================= */

export const EXTRACT_INTAKE_TOOL_NAME = "extract_intake" as const;

const ELECTRICAL_TYPE_ENUM = [
  "standard_breakers",
  "federal_pacific_stab_lok",
  "knob_and_tube",
  "aluminum_branch",
  "fuse_box",
  "mixed",
  "unknown",
] as const;

export const EXTRACT_INTAKE_TOOL: ToolDefinition = {
  name: EXTRACT_INTAKE_TOOL_NAME,
  description:
    "Emit the structured CarbonIntakePayload from the habitational COPE intake transcript. Call exactly once. Required fields: asset_class, contact, enrichment_confirmed. Optional fields are omitted when the prospect did not cover them. The construction_type field is populated from enrich_property tool results, never user-asked.",
  input_schema: {
    type: "object",
    properties: {
      asset_class: {
        type: "string",
        enum: ["multifamily", "mixed_use", "sfr_portfolio", "hoa", "unknown"],
        description:
          "Habitational asset class. Use 'unknown' only if the transcript truly does not name a class.",
      },
      unit_count: { type: "number" },
      square_footage: { type: "number" },
      year_built: { type: "number" },
      sprinklered: { type: "boolean" },
      central_station_alarm: { type: "boolean" },
      electrical_type: {
        type: "string",
        enum: [...ELECTRICAL_TYPE_ENUM],
        description:
          "Electrical service type. federal_pacific_stab_lok, knob_and_tube, and aluminum_branch are carrier-killer signals.",
      },
      gross_annual_rents: { type: "number", description: "USD numeric." },
      effective_date: { type: "string", description: "ISO 8601 (YYYY-MM-DD) when extractable, free-text otherwise." },
      current_carrier: {
        type: ["string", "null"] as unknown as string,
        description: "Current insurance carrier name, or null if no current carrier.",
      },
      expiring_premium_usd: {
        type: ["number", "null"] as unknown as string,
        description: "Expiring premium in USD as a number (no $ sign, no commas), or null if not disclosed.",
      },
      loss_history_5yr: {
        type: "array",
        description:
          "Self-reported claim entries from the last 5 years. Empty array if the prospect said 'no claims' or 'none'. Do NOT include loss-run data — those are gathered post-handoff.",
        items: {
          type: "object",
          properties: {
            year: { type: "number" },
            type: { type: "string", description: "e.g. 'water damage', 'slip and fall', 'fire'." },
            approx_amount_usd: { type: "number" },
          },
          required: ["year", "type", "approx_amount_usd"],
        },
      },
      flood_concern_volunteered: {
        type: "boolean",
        description:
          "Passive-listener flag. true when the prospect mentioned flood / FEMA zone / water intrusion at any point. Carbon never asks about flood directly in the habitational COPE sequence.",
      },
      property_mgmt_disclosed: {
        type: ["string", "null"] as unknown as string,
        description:
          "Passive-listener field. Description of any third-party property manager (e.g. 'Greystar runs it'). null when no third-party PM was disclosed.",
      },
      construction_type: {
        type: ["string", "null"] as unknown as string,
        description:
          "Populated from enrich_property's parcel data. Never user-asked. null when enrichment was unavailable.",
      },
      named_insured: {
        type: "string",
        description:
          "Entity on the dec page (e.g. 'ACME Holdings LLC'). Distinct from contact.name.",
      },
      contact: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string", description: "Free-text role: 'owner', 'asset manager', 'property manager', 'broker referral', etc." },
          email: { type: "string" },
          phone: { type: "string" },
        },
      },
      consent: {
        type: "boolean",
        description:
          "Explicit consent to share with markets. true if the prospect agreed; false if they declined or asked to hold off.",
      },
      enrichment_confirmed: {
        type: "boolean",
        description:
          "true after the Turn 2 enrichment confirmation has been completed (prospect confirmed or corrected the structured facts surfaced from enrich_property).",
      },
      inquiry_trigger: { type: "string" },
      handoff: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            enum: [
              "coverage_interpretation",
              "portfolio_tiv_over_10m",
              "active_loss",
              "litigation_pending",
              "out_of_appetite",
            ],
            description: "Which of the five hard-handoff triggers fired.",
          },
          notes: { type: "string", description: "≤ 280 chars of the prospect's triggering phrasing." },
        },
        required: ["reason"],
      },
      portfolio: {
        type: "object",
        properties: {
          is_portfolio: { type: "boolean" },
          property_count: { type: "number" },
          total_tiv_usd: { type: "number" },
        },
        required: ["is_portfolio"],
      },
    },
    required: ["asset_class", "contact", "enrichment_confirmed"],
  },
};

/** Extract-mode tool list. The route passes this with
 *  tool_choice: { type: "tool", name: "extract_intake" } to force the
 *  model to call the tool and only the tool. */
export const EXTRACT_TOOLS: ToolDefinition[] = [EXTRACT_INTAKE_TOOL];

export type ToolResult = {
  /** Free-text payload the model reads back as the tool's output. */
  content: string;
  /** When set, surfaced separately by /api/chat for the client to render. */
  data?: PropertyFacts;
  /** True when the tool executed without throwing — distinct from the
   *  upstream service returning a partial-failure envelope. */
  ok: boolean;
};

/**
 * Dispatcher. `origin` is the absolute URL base from which the tool
 * reaches back into the same deployment for the enrichment route.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  origin: string,
): Promise<ToolResult> {
  switch (name) {
    case "enrich_property":
      return executeEnrichProperty(input, origin);
    default:
      return {
        ok: false,
        content: `Tool "${name}" is not registered.`,
      };
  }
}

async function executeEnrichProperty(
  input: Record<string, unknown>,
  origin: string,
): Promise<ToolResult> {
  const address =
    typeof input.address === "string" ? input.address.trim() : "";
  if (!address) {
    return { ok: false, content: "enrich_property requires a non-empty address." };
  }

  try {
    const res = await fetch(`${origin}/api/property/enrich`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address }),
    });
    const data = (await res.json().catch(() => null)) as
      | PropertyFacts
      | { error: string }
      | null;

    if (!data || (res.status >= 500 && "error" in data)) {
      return {
        ok: false,
        content: `Enrichment failed (HTTP ${res.status}). Ask the user for the missing facts directly.`,
      };
    }
    if ("error" in data) {
      return { ok: false, content: `Enrichment error: ${data.error}` };
    }

    const lines = composeEnrichmentLines(data);
    if (lines.length === 1) {
      lines.push(
        "No public records returned facts for this address. Ask the user for the missing details (units, year built, square footage, current carrier).",
      );
    }

    return {
      ok: true,
      content: lines.join("\n"),
      data,
    };
  } catch (e) {
    return {
      ok: false,
      content: `Network error reaching enrichment service: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/* =========================================================================
 * Enrichment-line composer — extracted in C.S.1.7.0i for unit testing.
 *
 * Turns a PropertyFacts object into the compact line-by-line block the
 * model reads back as the tool's `content`. Order is optimized for the
 * underwriter eye (land use leads, then year/size/construction, then
 * SFR detail, then owner/id). Empty fields are omitted (Realie + CA
 * counties both return sparse records depending on what the source
 * actually publishes).
 *
 * History:
 *   C.S.1.6.6 — land_use_desc moved to the top so the asset-type
 *               inference rule has signal before secondary facts.
 *   C.S.1.7.0b — lot size dropped (insurance-tuning DROP list).
 *   C.S.1.7.0e — construction sanity-check flag handling added.
 *   C.S.1.7.0i — condo-unit disambiguation hint added (canonical
 *                case: Realie returns one condo unit's record for a
 *                multi-unit building; chat asks user to confirm).
 * ========================================================================= */

export function composeEnrichmentLines(data: PropertyFacts): string[] {
  const lines: string[] = [];
  lines.push(`Address (canonical): ${data.canonical_address ?? data.query_address}`);
  if (data.land_use_desc) {
    lines.push(`Land use: ${data.land_use_desc}${data.land_use_code ? ` (code ${data.land_use_code})` : ""}`);
  } else if (data.land_use_code) {
    lines.push(`Land use code: ${data.land_use_code}`);
  }
  if (typeof data.units === "number") lines.push(`Units: ${data.units}`);
  if (typeof data.year_built === "number") lines.push(`Year built: ${data.year_built}`);
  if (typeof data.building?.effective_year_built === "number") {
    lines.push(`Effective year built (post-rehab): ${data.building.effective_year_built}`);
  }
  if (typeof data.square_feet === "number") lines.push(`Square feet: ${data.square_feet}`);
  if (data.construction_type) {
    lines.push(`Construction: ${data.construction_type}`);
  } else if (data.building?.constructionTypeFlag === "unreliable_county_data") {
    // C.S.1.7.0e sanity-check fired — the county code didn't match
    // the building's height (e.g. 13-story wood frame). Tell the
    // model to ask the user directly instead of guessing.
    lines.push(
      `Construction: county records flagged unreliable for this building's height — ask the user for the actual construction type (wood frame, steel frame, reinforced concrete, masonry, etc.).`,
    );
  }
  if (typeof data.building?.stories === "number") lines.push(`Stories: ${data.building.stories}`);
  if (typeof data.building?.sprinklered === "boolean") {
    lines.push(`Sprinklered: ${data.building.sprinklered ? "yes" : "no"}`);
  }
  if (data.building?.roof_type) lines.push(`Roof type: ${data.building.roof_type}`);
  if (typeof data.building?.bedrooms === "number") lines.push(`Bedrooms: ${data.building.bedrooms}`);
  if (typeof data.building?.bathrooms === "number") lines.push(`Bathrooms: ${data.building.bathrooms}`);
  if (data.owner_of_record) lines.push(`Owner of record: ${data.owner_of_record}`);
  if (data.parcel_id) lines.push(`Parcel ID: ${data.parcel_id}`);

  // C.S.1.7.0i — condo-unit disambiguation. Realie (the non-CA
  // fallback) keys its property records at the condo-unit level —
  // a 6-unit apartment building that's been legally subdivided into
  // 6 condo parcels returns ONE unit's record (single sqft, single
  // br/ba, "Condominium Unit" use code) per lookup. Surfacing those
  // as "the property" is misleading: the user may be insuring the
  // whole multi-unit building, not the single unit. Production
  // report: 2708 Holmes St KC returned 1158 sqft 2br/2ba condo
  // when the actual building is 6 units. Hint tells the chat to
  // ask the user which they're insuring.
  const useDesc = (data.land_use_desc ?? "").toLowerCase();
  if (useDesc.includes("condominium") || useDesc.includes("condo unit")) {
    lines.push(
      `Note: county/aggregator records show this parcel as a single condominium unit. If the user is insuring the whole multi-unit building (not just this one condo unit), the unit count and square footage above describe ONE unit only, not the whole building. Ask the user: "Records show this parcel as a single condo unit — are you insuring this one unit, or the whole multi-unit building it's part of?"`,
    );
  }

  if (data.sources_failed.length > 0) {
    lines.push(`Sources that did not return data: ${data.sources_failed.join(", ")}.`);
  }
  return lines;
}
