/**
 * System-prompt builder — sprint C.S.1.6.5.
 *
 * `buildSystemPrompt` is a PURE function: given a `TenantIntakeConfig`
 * it returns the full Anthropic system prompt string. No I/O, no env
 * reads, no randomness — same config in, same string out. That makes
 * it trivially testable and lets the /api/chat route wrap the result
 * in a cache-control breakpoint without surprises.
 *
 * Section order (mirrors the C.S.1.6.5 spec):
 *   1.  Identity line
 *   2.  Role paragraph
 *   3.  Tone
 *   4.  Scope (specialties / geography / out-of-scope)
 *   5.  Intake sequence (numbered field list)
 *   6.  Hard handoff triggers
 *   7.  Portfolio TIV limit (if set)
 *   7b. Extended sections (incumbent-fidelity escape hatch)
 *   8.  Wrap-up instructions
 *   9.  enrich_property tool instruction
 *   10. Rate band section (only if rateBandYaml is non-empty)
 *   11. Never-do list
 */

import type { TenantIntakeConfig } from "./tenants";

/** Heading that marks the rate-band section. Tests assert on this
 *  string to verify the section is present / absent. */
const RATE_BAND_HEADING = "=== RATE BAND INDICATION DATA ===";

export function buildSystemPrompt(config: TenantIntakeConfig): string {
  const parts: string[] = [];

  /* 1. Identity ----------------------------------------------------- */
  parts.push(
    `You are a professional intake specialist for ${config.name}${
      config.tagline ? ` — ${config.tagline}` : ""
    }.`,
  );

  /* 2. Role --------------------------------------------------------- */
  parts.push(
    `Your job is to walk a prospect through a structured intake conversation and gather everything a human specialist needs to quote their risk, then hand off. You are not the underwriter. You do not quote pricing. You do not bind coverage. You collect, confirm, and route.`,
  );

  /* 3. Tone --------------------------------------------------------- */
  parts.push(`# TONE\n\n${config.agent.toneNotes}`);

  /* 4. Scope -------------------------------------------------------- */
  parts.push(
    [
      "# SCOPE",
      "",
      "Specialties you write:",
      ...config.scope.specialties.map((s) => `- ${s}`),
      "",
      `Geography you serve: ${config.scope.geography.join(", ")}.`,
      "",
      `When a prospect's risk falls outside that scope, respond: "${config.scope.outOfScopeMessage}"`,
    ].join("\n"),
  );

  /* 5. Intake sequence --------------------------------------------- */
  const fieldLines: string[] = ["# INTAKE SEQUENCE", "", "Work through these in order. If the prospect volunteers a later field early, mark it captured and skip ahead. Never re-ask a captured field."];
  config.intake.fields.forEach((field, i) => {
    fieldLines.push("");
    fieldLines.push(
      `${i + 1}. ${field.label}${field.required ? " (required)" : " (optional)"}`,
    );
    fieldLines.push(`   Ask: ${field.conversational}`);
    if (field.notes) fieldLines.push(`   Notes: ${field.notes}`);
  });
  parts.push(fieldLines.join("\n"));

  /* 6. Hard handoff triggers --------------------------------------- */
  const triggerLines: string[] = [
    "# HARD HANDOFF TRIGGERS",
    "",
    `When ANY trigger below fires, STOP the intake immediately, do not continue gathering fields, do not indicate price or terms, deliver the trigger's specialist message, summarize what you have captured, and route to ${config.intake.specialistLabel}. A specialist will follow up ${config.intake.followUpSla}.`,
  ];
  for (const trigger of config.intake.hardHandoffTriggers) {
    triggerLines.push("");
    triggerLines.push(`Trigger: ${trigger.id} (reason: ${trigger.reason})`);
    triggerLines.push(
      `  Fires on phrasing like: ${trigger.matchPatterns
        .map((p) => `"${p}"`)
        .join(", ")}`,
    );
    triggerLines.push(`  Say: "${trigger.specialistMessage}"`);
  }
  parts.push(triggerLines.join("\n"));

  /* 7. Portfolio TIV limit ----------------------------------------- */
  if (typeof config.intake.portfolioTivLimitUsd === "number") {
    parts.push(
      [
        "# PORTFOLIO SIZE LIMIT",
        "",
        `If the prospect's total insured value across all properties exceeds ${formatUsd(
          config.intake.portfolioTivLimitUsd,
        )}, this is a large-account risk handled by the commercial team, not this intake flow. Treat it as the portfolio handoff trigger.`,
      ].join("\n"),
    );
  }

  /* 7b. Extended sections (incumbent-fidelity escape hatch) -------- */
  if (config.extendedSections && config.extendedSections.length > 0) {
    for (const section of config.extendedSections) {
      parts.push(`# ${section.heading}\n\n${section.body}`);
    }
  }

  /* 8. Wrap-up ------------------------------------------------------ */
  parts.push(
    [
      "# WRAP-UP",
      "",
      "When the intake sequence is complete (or the prospect has shared everything they are willing to) AND no handoff trigger has fired:",
      `1. Briefly summarize what you captured back to the prospect.`,
      `2. Emit this exact sentinel so the system knows intake is done: "${config.agent.wrapUpSentinel}"`,
      `3. Tell them a specialist will be in touch ${config.intake.followUpSla}.`,
      "",
      "Do NOT emit the sentinel if a handoff trigger fired earlier, or if major required fields are still missing.",
      "",
      "The structured summary the system records uses this template:",
      "",
      config.output.summaryTemplate,
    ].join("\n"),
  );

  /* 9. enrich_property tool ---------------------------------------- */
  parts.push(
    [
      "# PROPERTY ENRICHMENT TOOL",
      "",
      "You have an `enrich_property` tool. Call it on ANY property address the prospect provides, before continuing the conversation. Use the returned data — canonical address, parcel facts, year built, units, square footage, construction — to avoid re-asking facts the lookup already answered. The tool's output is your only source of truth for property data.",
    ].join("\n"),
  );

  /* 10. Rate band (only when populated) ---------------------------- */
  if (config.rateBandYaml && config.rateBandYaml.trim().length > 0) {
    parts.push(
      [
        RATE_BAND_HEADING,
        "",
        "Indication ranges below are reference data for pricing-language questions. Never quote a price; share a range only when the gating fields are in hand.",
        "",
        config.rateBandYaml,
      ].join("\n"),
    );
  }

  /* 11. Never-do list ---------------------------------------------- */
  parts.push(
    [
      "# NEVER DO",
      "",
      "- Never quote a specific premium or bind coverage.",
      "- Never make a coverage determination (whether a claim is or will be covered).",
      "- Never name specific insurance carriers as recommendations.",
      "- Never disclose that you are an AI or language model.",
      "- Never invent property facts the enrich_property tool did not return.",
    ].join("\n"),
  );

  return parts.join("\n\n");
}

/** Formats a USD integer as a compact dollar string ($10,000,000). */
function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export { RATE_BAND_HEADING };
