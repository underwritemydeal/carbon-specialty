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
 * extract_intake — C.S.1.7.0k structured-extraction tool
 *
 * The model is forced to call this exactly once with the structured
 * CarbonIntakePayload. The route reads `tool_use.input` and returns it
 * verbatim to the client; there is no server-side execution. Forced
 * tool-use eliminates the JSON-parsing failure mode the C.S.1.7.0j
 * second LLM call ran into when the model wrapped its output in
 * markdown fences or trailing prose.
 *
 * The input_schema mirrors the documentation block in
 * CARBON_EXTRACTION_SYSTEM_PROMPT (carbon-system-prompt.ts). Both must
 * be updated together when the payload shape changes.
 * ========================================================================= */

export const EXTRACT_INTAKE_TOOL_NAME = "extract_intake" as const;

const PERIL_INTEREST_ENUM = ["currently_carry", "looking_to_add", "not_interested", "unknown"] as const;

export const EXTRACT_INTAKE_TOOL: ToolDefinition = {
  name: EXTRACT_INTAKE_TOOL_NAME,
  description:
    "Emit the structured CarbonIntakePayload from the intake transcript. Call exactly once. All fields except asset_type, location, and contact are optional — omit fields the prospect did not cover.",
  input_schema: {
    type: "object",
    properties: {
      asset_type: {
        type: "string",
        enum: [
          "multifamily",
          "mixed_use",
          "sfr_portfolio",
          "hoa",
          "condo_unit",
          "small_commercial_re",
          "builders_risk",
          "unknown",
        ],
        description: "Carbon's seven asset classes plus 'unknown' when not stated.",
      },
      location: {
        type: "object",
        properties: {
          city: { type: "string" },
          state: { type: "string", description: "Two-letter state code (CA, NY, TX)." },
          address: { type: "string" },
        },
      },
      unit_count: { type: "number" },
      year_built: { type: "number" },
      construction_type: { type: "string" },
      coverage_scope: {
        type: "string",
        enum: ["property_only", "property_liability", "full_package", "unknown"],
      },
      eq_exposure: { type: "string" },
      eq_interest: { type: "string", enum: [...PERIL_INTEREST_ENUM] },
      flood_exposure: { type: "string" },
      flood_interest: { type: "string", enum: [...PERIL_INTEREST_ENUM] },
      loss_history_summary: { type: "string" },
      effective_date: {
        type: "string",
        description: "ISO YYYY-MM-DD when extractable, free-text otherwise.",
      },
      current_carrier: { type: "string" },
      current_expiration: { type: "string", description: "ISO YYYY-MM-DD if extractable." },
      expiring_premium: {
        type: "number",
        description: "USD numeric — \"$18,500\" → 18500.",
      },
      contact: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          role: {
            type: "string",
            enum: [
              "owner",
              "asset_manager",
              "property_manager",
              "broker_referral",
              "other",
              "unknown",
            ],
          },
          preferred_method: { type: "string", enum: ["email", "phone", "either"] },
        },
      },
      consent_to_share_with_markets: { type: "boolean" },
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
    required: ["asset_type", "location", "contact"],
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
