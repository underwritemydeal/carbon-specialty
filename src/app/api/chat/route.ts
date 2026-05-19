import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildIntakeSystemBlocks,
  CARBON_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/carbon-system-prompt";
import {
  TOOLS,
  EXTRACT_TOOLS,
  EXTRACT_INTAKE_TOOL_NAME,
  executeTool,
} from "@/lib/chat-tools";
import {
  appendDisclaimers,
  type DisclaimerKind,
} from "@/lib/disclaimers";
import {
  normalizeState,
  type RateBandAssetClass,
  type RateBandContext,
} from "@/lib/rate-bands";
import type { PropertyFacts } from "@/lib/property-facts";

export const runtime = "nodejs";
// Tool loops can take a moment — give the function room to breathe but
// well under the 300s platform default.
export const maxDuration = 60;

/**
 * /api/chat — sprint C.S.1.7.0k.
 *
 * Two modes: intake and extract.
 *
 * Intake mode
 * -----------
 *   POST { messages, mode: "intake" } → Anthropic Messages API (Haiku 4.5)
 *   with a cache-friendly two-block system payload:
 *     [0] stable prompt + ephemeral cache breakpoint
 *     [1] dynamic rate-band slice (varies per turn from the running
 *         RateBandContext we derive from the most recent enrich_property
 *         result + anything the user volunteered)
 *   The route runs a server-side tool-use loop (enrich_property only)
 *   until a non-tool stop, then appends locked disclaimers (see
 *   src/lib/disclaimers.ts) when pricing / coverage-scope / data-source
 *   language is detected in the final assistant text.
 *
 * Extract mode
 * ------------
 *   POST { messages, mode: "extract" } → forced tool-use of
 *   `extract_intake`. tool_choice pins the call so the model can't
 *   sidestep the schema. The route reads the tool_use.input directly
 *   and returns it as `payload` — no free-text JSON to parse, no
 *   markdown-fence stripping. Replaces the C.S.1.7.0j second-LLM-call
 *   extraction.
 *
 * Error categories (all logged with prefix [carbon-chat]):
 *   - BAD_REQUEST          — missing/malformed body, missing env key
 *   - ANTHROPIC_AUTH       — 401/403 from Anthropic
 *   - ANTHROPIC_RATE_LIMIT — 429
 *   - ANTHROPIC_SERVER     — 5xx or network
 *   - TOOL_EXECUTION_FAIL  — tool dispatcher threw or returned ok:false
 *   - LOOP_EXHAUSTED       — hit MAX_TOOL_ITERATIONS without natural stop
 *   - EXTRACT_NO_TOOL_USE  — extract mode came back without the
 *                            forced tool_use (model refused / drifted)
 *
 * Graceful degradation: a missing ANTHROPIC_API_KEY does NOT crash —
 * the route returns 503 with a BAD_REQUEST envelope so the CarbonChat
 * client falls through to its contact-form mode (existing behavior).
 */

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 5;

export type ChatMessage = { role: "user" | "assistant"; content: string };

interface ChatResponseEnvelope {
  ok: boolean;
  text?: string;
  tools_executed?: string[];
  property_facts?: PropertyFacts;
  /** Disclaimer kinds the route appended to `text` on this turn. */
  disclaimers_applied?: DisclaimerKind[];
  /** Extract-mode only — the structured CarbonIntakePayload. */
  payload?: Record<string, unknown>;
  error?: string;
  error_kind?:
    | "BAD_REQUEST"
    | "ANTHROPIC_AUTH"
    | "ANTHROPIC_RATE_LIMIT"
    | "ANTHROPIC_SERVER"
    | "TOOL_EXECUTION_FAIL"
    | "LOOP_EXHAUSTED"
    | "EXTRACT_NO_TOOL_USE";
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[carbon-chat] BAD_REQUEST — ANTHROPIC_API_KEY not configured");
    return envelopeError(
      "Chat service is not configured. Please use the contact form.",
      "BAD_REQUEST",
      503,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return envelopeError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const messages = extractMessages(body);
  if (!messages) {
    return envelopeError("Missing or invalid `messages` array", "BAD_REQUEST", 400);
  }

  const mode: "intake" | "extract" =
    (body as { mode?: unknown }).mode === "extract" ? "extract" : "intake";

  const origin = new URL(req.url).origin;
  const anthropic = new Anthropic({ apiKey });

  if (mode === "extract") {
    return runExtract(anthropic, messages);
  }
  return runIntake(anthropic, messages, origin);
}

/* =========================================================================
 * Extract mode — forced tool-use of `extract_intake`. The model returns
 * a single tool_use block whose `input` IS the CarbonIntakePayload. The
 * route reads and returns it verbatim.
 * ========================================================================= */

async function runExtract(anthropic: Anthropic, messages: ChatMessage[]) {
  let resp: Anthropic.Message;
  try {
    resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: CARBON_EXTRACTION_SYSTEM_PROMPT,
      tools: EXTRACT_TOOLS,
      tool_choice: { type: "tool", name: EXTRACT_INTAKE_TOOL_NAME },
      messages: messages as Anthropic.MessageParam[],
    });
  } catch (e) {
    return handleAnthropicError(e);
  }

  const toolUse = resp.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === EXTRACT_INTAKE_TOOL_NAME,
  );
  if (!toolUse) {
    console.error("[carbon-chat] EXTRACT_NO_TOOL_USE — model returned without forced tool call");
    return envelopeError(
      "Extraction model did not return a structured payload.",
      "EXTRACT_NO_TOOL_USE",
      502,
    );
  }

  const payload =
    toolUse.input && typeof toolUse.input === "object"
      ? (toolUse.input as Record<string, unknown>)
      : {};

  return NextResponse.json<ChatResponseEnvelope>({
    ok: true,
    payload,
    tools_executed: [EXTRACT_INTAKE_TOOL_NAME],
  });
}

/* =========================================================================
 * Intake mode — full tool-use loop, two-block system payload with cache
 * breakpoint, disclaimer concatenation post-stream.
 * ========================================================================= */

async function runIntake(
  anthropic: Anthropic,
  messages: ChatMessage[],
  origin: string,
) {
  // Working copy. The loop appends assistant and user (tool_result) turns.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  type WireMessage =
    | { role: "user" | "assistant"; content: string }
    | {
        role: "user";
        content: Array<
          | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }
        >;
      }
    | {
        role: "assistant";
        content: Array<
          | { type: "text"; text: string }
          | { type: "tool_use"; id: string; name: string; input: unknown }
        >;
      };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const wire: WireMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const toolsExecuted: string[] = [];
  let lastPropertyFacts: PropertyFacts | undefined;
  let rateBandContext: RateBandContext = deriveContextFromTranscript(messages);
  let iteration = 0;

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration += 1;
    let resp: Anthropic.Message;
    try {
      resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildIntakeSystemBlocks(rateBandContext),
        tools: TOOLS,
        messages: wire as Anthropic.MessageParam[],
      });
    } catch (e) {
      return handleAnthropicError(e);
    }

    // Append the model's response (text + tool_use blocks) verbatim so
    // the next loop iteration can reference tool_use ids.
    wire.push({ role: "assistant", content: resp.content as never });

    if (resp.stop_reason !== "tool_use") {
      const rawText = collectText(resp.content);
      const { text, applied } = appendDisclaimers(rawText);
      return NextResponse.json<ChatResponseEnvelope>({
        ok: true,
        text,
        tools_executed: toolsExecuted,
        property_facts: lastPropertyFacts,
        disclaimers_applied: applied,
      });
    }

    // Execute every tool_use block in this turn before re-invoking.
    const toolUses = resp.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) {
      // Defensive: stop_reason said tool_use but no blocks found. Treat
      // as a natural stop with whatever text is present.
      const rawText = collectText(resp.content);
      const { text, applied } = appendDisclaimers(rawText);
      return NextResponse.json<ChatResponseEnvelope>({
        ok: true,
        text,
        tools_executed: toolsExecuted,
        property_facts: lastPropertyFacts,
        disclaimers_applied: applied,
      });
    }

    const toolResults: Array<{
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }> = [];

    // C.S.1.7.0g — capture the user's most recent message so each tool
    // result log entry has the prompt that triggered it.
    const latestUserInput = findLatestUserText(messages);

    for (const use of toolUses) {
      const input =
        use.input && typeof use.input === "object"
          ? (use.input as Record<string, unknown>)
          : {};
      const t0 = Date.now();
      let result;
      try {
        result = await executeTool(use.name, input, origin);
      } catch (e) {
        const elapsedMs = Date.now() - t0;
        console.error("[carbon-chat] TOOL_EXECUTION_FAIL", use.name, e);
        logToolResult({
          user_input: latestUserInput,
          tool_name: use.name,
          tool_input: input,
          tool_output_content: null,
          tool_output_data: null,
          ok: false,
          threw: e instanceof Error ? e.message : String(e),
          elapsed_ms: elapsedMs,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: `Tool error: ${e instanceof Error ? e.message : String(e)}`,
          is_error: true,
        });
        continue;
      }
      const elapsedMs = Date.now() - t0;
      toolsExecuted.push(use.name);
      if (result.data) {
        lastPropertyFacts = result.data;
        // Update the rate-band context from the fresh property facts so
        // the next iteration's slice reflects what we just learned.
        rateBandContext = mergeContext(rateBandContext, contextFromFacts(result.data));
      }
      logToolResult({
        user_input: latestUserInput,
        tool_name: use.name,
        tool_input: input,
        tool_output_content: result.content,
        tool_output_data: result.data
          ? (result.data as unknown as Record<string, unknown>)
          : null,
        ok: result.ok,
        threw: null,
        elapsed_ms: elapsedMs,
      });
      toolResults.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: result.content,
        is_error: !result.ok,
      });
    }

    wire.push({ role: "user", content: toolResults });
  }

  console.warn("[carbon-chat] LOOP_EXHAUSTED after", MAX_TOOL_ITERATIONS, "iterations");
  return envelopeError(
    "The assistant got stuck in a tool loop. Please rephrase your request.",
    "LOOP_EXHAUSTED",
    500,
  );
}

/* =========================================================================
 * Rate-band context derivation
 *
 * The rate-band slice gates on four fields: asset_class, state,
 * unit_count, year_built. Two sources contribute:
 *
 *   1. Property facts from enrich_property — canonical state (parsed
 *      from the formatted_address), units, year_built. Filled as the
 *      tool returns data.
 *
 *   2. User transcript — asset class hints ("apartment building",
 *      "mixed-use", "HOA"). Light pattern match; the rate-band slice
 *      is permissive about partial context.
 *
 * Context is rebuilt at the start of each request from `messages` and
 * progressively updated as tool results come in mid-loop. We do NOT
 * persist it across HTTP requests — every POST recomputes from the
 * full transcript, which is the source of truth.
 * ========================================================================= */

const ASSET_CLASS_HINTS: Array<{ re: RegExp; cls: RateBandAssetClass }> = [
  { re: /\b(apartment\s+building|multi[-\s]?family|multifamily)\b/i, cls: "multifamily" },
  { re: /\bmixed[-\s]?use\b/i, cls: "mixed_use" },
  { re: /\b(sfr\s+portfolio|scattered[-\s]?site|single[-\s]?family\s+rentals)\b/i, cls: "sfr_portfolio" },
  { re: /\b(HOA|condo\s+association|homeowners\s+association)\b/i, cls: "hoa" },
  { re: /\b(condo\s+unit|single\s+condo|the\s+unit\s+I\s+own)\b/i, cls: "condo_unit" },
  { re: /\b(builders?[-\s]?risk|ground[-\s]?up|adaptive\s+reuse|new\s+construction)\b/i, cls: "builders_risk" },
  { re: /\b(office|retail|industrial|warehouse|owner[-\s]?occupied)\b/i, cls: "small_commercial_re" },
];

function deriveContextFromTranscript(messages: ChatMessage[]): RateBandContext {
  let asset_class: RateBandAssetClass | undefined;
  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const hint of ASSET_CLASS_HINTS) {
      if (hint.re.test(m.content)) {
        asset_class = hint.cls;
        break;
      }
    }
    if (asset_class) break;
  }
  return { asset_class };
}

function contextFromFacts(facts: PropertyFacts): RateBandContext {
  const out: RateBandContext = {};
  // Pull the two-letter state code out of the canonical address. The
  // geocoder writes it in the standard ", CA " / ", CA, " positions.
  const canon = facts.canonical_address ?? "";
  const stateMatch = canon.match(/,\s*([A-Z]{2})(?:[\s,]|$)/);
  if (stateMatch && normalizeState(stateMatch[1])) {
    out.state = stateMatch[1];
  }
  if (typeof facts.units === "number") out.unit_count = facts.units;
  if (typeof facts.year_built === "number") out.year_built = facts.year_built;
  // Asset class can be inferred from land_use_desc on common cases. The
  // chat will still confirm with the user, but the slice surfaces a
  // band immediately when the inference is clean.
  const useDesc = (facts.land_use_desc ?? "").toLowerCase();
  if (typeof facts.units === "number" && facts.units >= 5 && useDesc.includes("residential")) {
    out.asset_class = "multifamily";
  } else if (useDesc.includes("multi-family") || useDesc.includes("multifamily")) {
    out.asset_class = "multifamily";
  } else if (useDesc.includes("mixed")) {
    out.asset_class = "mixed_use";
  } else if (useDesc.includes("condominium")) {
    out.asset_class = "condo_unit";
  }
  return out;
}

function mergeContext(base: RateBandContext, next: RateBandContext): RateBandContext {
  return {
    asset_class: next.asset_class ?? base.asset_class,
    state: next.state ?? base.state,
    unit_count: next.unit_count ?? base.unit_count,
    year_built: next.year_built ?? base.year_built,
  };
}

/* =========================================================================
 * Helpers
 * ========================================================================= */

function extractMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw)) return null;
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") return null;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return null;
    }
    out.push({ role, content });
  }
  if (out.length === 0) return null;
  return out;
}

function collectText(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/* =========================================================================
 * Structured tool-result logging — C.S.1.7.0g
 *
 * Emitted once per tool execution (success or thrown). Single JSON
 * line, one prefix, easy grep:
 *
 *   vercel logs --since 1h | grep '\[carbon-chat:tool-result\]'
 * ========================================================================= */

const LOG_TRUNCATE_CHARS = 500;

interface ToolResultLogEntry {
  user_input: string | null;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output_content: string | null;
  tool_output_data: Record<string, unknown> | null;
  ok: boolean;
  threw: string | null;
  elapsed_ms: number;
}

export function logToolResult(entry: ToolResultLogEntry): void {
  const sources_succeeded =
    entry.tool_output_data &&
    Array.isArray((entry.tool_output_data as { sources_succeeded?: unknown }).sources_succeeded)
      ? ((entry.tool_output_data as { sources_succeeded?: string[] }).sources_succeeded ?? [])
      : [];
  const sources_failed =
    entry.tool_output_data &&
    Array.isArray((entry.tool_output_data as { sources_failed?: unknown }).sources_failed)
      ? ((entry.tool_output_data as { sources_failed?: string[] }).sources_failed ?? [])
      : [];

  const payload = {
    user_input: truncateString(entry.user_input, LOG_TRUNCATE_CHARS),
    tool_name: entry.tool_name,
    tool_input: entry.tool_input,
    tool_output_content: truncateString(entry.tool_output_content, LOG_TRUNCATE_CHARS),
    tool_output_data: entry.tool_output_data,
    sources_succeeded,
    sources_failed,
    ok: entry.ok,
    threw: entry.threw,
    elapsed_ms: entry.elapsed_ms,
  };

  let serialized: string;
  try {
    serialized = JSON.stringify(payload);
  } catch (e) {
    serialized = JSON.stringify({
      tool_name: entry.tool_name,
      log_serialize_error: e instanceof Error ? e.message : String(e),
    });
  }
  console.log(`[carbon-chat:tool-result] ${serialized}`);
}

function truncateString(s: string | null, cap: number): string | null {
  if (s == null) return null;
  if (s.length <= cap) return s;
  return `${s.slice(0, cap)}…[truncated ${s.length - cap}]`;
}

function findLatestUserText(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return null;
}

function envelopeError(
  message: string,
  kind: NonNullable<ChatResponseEnvelope["error_kind"]>,
  status: number,
) {
  return NextResponse.json<ChatResponseEnvelope>(
    { ok: false, error: message, error_kind: kind },
    { status },
  );
}

function handleAnthropicError(e: unknown) {
  if (e instanceof Anthropic.APIError) {
    const status = e.status ?? 0;
    if (status === 401 || status === 403) {
      console.error("[carbon-chat] ANTHROPIC_AUTH", status, e.message);
      return envelopeError("Chat service authentication failed.", "ANTHROPIC_AUTH", 503);
    }
    if (status === 429) {
      console.warn("[carbon-chat] ANTHROPIC_RATE_LIMIT", e.message);
      return envelopeError("Chat service is rate-limited right now.", "ANTHROPIC_RATE_LIMIT", 429);
    }
    if (status >= 500) {
      console.error("[carbon-chat] ANTHROPIC_SERVER", status, e.message);
      return envelopeError("Chat service is having trouble.", "ANTHROPIC_SERVER", 502);
    }
    console.error("[carbon-chat] ANTHROPIC_SERVER", status, e.message);
    return envelopeError("Chat service returned an error.", "ANTHROPIC_SERVER", 502);
  }
  console.error("[carbon-chat] ANTHROPIC_SERVER (unclassified)", e);
  return envelopeError(
    "Chat service is unreachable.",
    "ANTHROPIC_SERVER",
    502,
  );
}
