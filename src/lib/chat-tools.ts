/**
 * Chat tools — sprint C.S.1.6.
 *
 * Registry of tools the Anthropic Messages API can call when handling
 * the Carbon intake conversation. Currently one tool — `enrich_property`
 * — but the dispatcher is structured so adding more tools (rate-band
 * lookup in C.S.1.7, lead-extraction-as-tool in the same sprint, etc.)
 * is one switch case.
 *
 * Tool implementations run server-side inside the /api/chat route on
 * the same Vercel deployment, so they reach the rest of the app via
 * the request's origin URL (an internal HTTP hop, not a direct module
 * import). The HTTP boundary is intentional — it keeps the tools
 * independently testable and would survive a future move to a separate
 * service without touching the chat route.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { PropertyFacts } from "./property-facts";

export type ToolDefinition = Anthropic.Tool;

/** Public tool catalog passed to the model on every request. */
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

    // Compose a compact human-readable string the model can quote.
    // C.S.1.6.6 — land_use_desc is the lead fact for asset-type
    // inference; surface it near the top of the block so the model
    // sees it before the secondary parcel facts.
    // C.S.1.7.0b insurance tuning — lot size line removed; effective
    // year + stories + sprinklered + roof lines added when present.
    // Order optimized for underwriter eye: land use → year(s) → size
    // → construction quality → SFR detail → owner / id.
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
    if (data.construction_type) lines.push(`Construction: ${data.construction_type}`);
    if (typeof data.building?.stories === "number") lines.push(`Stories: ${data.building.stories}`);
    if (typeof data.building?.sprinklered === "boolean") {
      lines.push(`Sprinklered: ${data.building.sprinklered ? "yes" : "no"}`);
    }
    if (data.building?.roof_type) lines.push(`Roof type: ${data.building.roof_type}`);
    if (typeof data.building?.bedrooms === "number") lines.push(`Bedrooms: ${data.building.bedrooms}`);
    if (typeof data.building?.bathrooms === "number") lines.push(`Bathrooms: ${data.building.bathrooms}`);
    if (data.owner_of_record) lines.push(`Owner of record: ${data.owner_of_record}`);
    if (data.parcel_id) lines.push(`Parcel ID: ${data.parcel_id}`);
    if (data.sources_failed.length > 0) {
      lines.push(`Sources that did not return data: ${data.sources_failed.join(", ")}.`);
    }
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
