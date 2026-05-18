import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  CARBON_INTAKE_SYSTEM_PROMPT,
  CARBON_EXTRACTION_SYSTEM_PROMPT,
} from "@/lib/carbon-system-prompt";
import { TOOLS, executeTool } from "@/lib/chat-tools";
import type { PropertyFacts } from "@/lib/property-facts";

export const runtime = "nodejs";
// Tool loops can take a moment — give the function room to breathe but
// well under the 300s platform default.
export const maxDuration = 60;

/**
 * /api/chat — sprint C.S.1.6.
 *
 * Replaces the Covr Worker for Carbon Specialty chat completions. POST
 * { messages: ChatMessage[] } → calls Anthropic Messages API (Haiku 4.5),
 * runs a server-side tool-use loop until the model returns a non-tool
 * stop_reason or we hit the 5-iteration cap, returns the final assistant
 * text plus a flat list of tools the loop executed (for the UI status).
 *
 * The system prompt is sent as a single block with
 * `cache_control: { type: "ephemeral" }` so it caches across turns and
 * the per-request input cost drops to the cache-read tier after the
 * first call.
 *
 * Error categories (all logged with prefix [carbon-chat]):
 *   - BAD_REQUEST         — missing/malformed body, missing env key
 *   - ANTHROPIC_AUTH      — 401/403 from Anthropic
 *   - ANTHROPIC_RATE_LIMIT — 429
 *   - ANTHROPIC_SERVER    — 5xx or network
 *   - TOOL_EXECUTION_FAIL — tool dispatcher threw or returned ok:false
 *   - LOOP_EXHAUSTED      — hit MAX_TOOL_ITERATIONS without natural stop
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
  error?: string;
  error_kind?:
    | "BAD_REQUEST"
    | "ANTHROPIC_AUTH"
    | "ANTHROPIC_RATE_LIMIT"
    | "ANTHROPIC_SERVER"
    | "TOOL_EXECUTION_FAIL"
    | "LOOP_EXHAUSTED";
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
 * Extract mode — single-shot, no tools, no cache (extraction prompt is
 * comparatively short and runs once per conversation).
 * ========================================================================= */

async function runExtract(anthropic: Anthropic, messages: ChatMessage[]) {
  let resp: Anthropic.Message;
  try {
    resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: CARBON_EXTRACTION_SYSTEM_PROMPT,
      messages: messages as Anthropic.MessageParam[],
    });
  } catch (e) {
    return handleAnthropicError(e);
  }
  const text = collectText(resp.content);
  return NextResponse.json<ChatResponseEnvelope>({
    ok: true,
    text,
    tools_executed: [],
  });
}

/* =========================================================================
 * Intake mode — full tool-use loop, prompt-cached system block.
 * ========================================================================= */

async function runIntake(
  anthropic: Anthropic,
  messages: ChatMessage[],
  origin: string,
) {

  // Working copy. The loop appends assistant and user (tool_result) turns.
  // Anthropic expects role: "user" content as either string OR array of
  // content blocks; tool_result needs the array form.
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
  let iteration = 0;

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration += 1;
    let resp: Anthropic.Message;
    try {
      resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: "text",
            text: CARBON_INTAKE_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
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
      const text = collectText(resp.content);
      return NextResponse.json<ChatResponseEnvelope>({
        ok: true,
        text,
        tools_executed: toolsExecuted,
        property_facts: lastPropertyFacts,
      });
    }

    // Execute every tool_use block in this turn before re-invoking.
    const toolUses = resp.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) {
      // Defensive: stop_reason said tool_use but no blocks found. Treat
      // as a natural stop with whatever text is present.
      const text = collectText(resp.content);
      return NextResponse.json<ChatResponseEnvelope>({
        ok: true,
        text,
        tools_executed: toolsExecuted,
        property_facts: lastPropertyFacts,
      });
    }

    const toolResults: Array<{
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }> = [];

    for (const use of toolUses) {
      const input =
        use.input && typeof use.input === "object"
          ? (use.input as Record<string, unknown>)
          : {};
      let result;
      try {
        result = await executeTool(use.name, input, origin);
      } catch (e) {
        console.error("[carbon-chat] TOOL_EXECUTION_FAIL", use.name, e);
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: `Tool error: ${e instanceof Error ? e.message : String(e)}`,
          is_error: true,
        });
        continue;
      }
      toolsExecuted.push(use.name);
      if (result.data) lastPropertyFacts = result.data;
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
