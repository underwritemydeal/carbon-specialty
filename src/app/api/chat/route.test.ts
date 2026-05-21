import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));

import { logToolResult, POST } from "./route";
import { captureServerEvent } from "@/lib/posthog-server";

/**
 * Tests for the C.S.1.7.0g structured tool-result logger. The brief
 * targets a production hallucination report (chat described a property
 * the user didn't ask about). These logs are the post-mortem signal:
 * for every enrich_property call, we capture the user's input, the
 * tool's args + output, and the upstream success/fail breakdown so we
 * can see WHAT the tool returned in the failing cases instead of
 * guessing whether the LLM made up the response.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

function captureLog(): { calls: unknown[][]; spy: ReturnType<typeof vi.spyOn> } {
  const calls: unknown[][] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    calls.push(args);
  });
  return { calls, spy };
}

describe("logToolResult — C.S.1.7.0g structured emit", () => {
  it("emits a single console.log line with the [carbon-chat:tool-result] prefix", () => {
    const { calls } = captureLog();
    logToolResult({
      user_input: "1247 Pine Ave Long Beach",
      tool_name: "enrich_property",
      tool_input: { address: "1247 Pine Ave Long Beach" },
      tool_output_content: "Address (canonical): 1247 Pine Ave…",
      tool_output_data: {
        query_address: "1247 Pine Ave Long Beach",
        canonical_address: "1247 Pine Ave, Long Beach, CA 90813, USA",
        sources_succeeded: ["geocoding", "la-county", "streetview"],
        sources_failed: [],
      },
      ok: true,
      threw: null,
      elapsed_ms: 184,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toMatch(/^\[carbon-chat:tool-result\] /);
  });

  it("encodes the payload as parseable JSON immediately after the prefix", () => {
    const { calls } = captureLog();
    logToolResult({
      user_input: "1247 Pine Ave",
      tool_name: "enrich_property",
      tool_input: { address: "1247 Pine Ave" },
      tool_output_content: "ok",
      tool_output_data: {
        sources_succeeded: ["geocoding"],
        sources_failed: ["realie"],
      },
      ok: true,
      threw: null,
      elapsed_ms: 100,
    });
    const line = String(calls[0][0]);
    const jsonStart = line.indexOf("{");
    const parsed = JSON.parse(line.slice(jsonStart));
    expect(parsed.user_input).toBe("1247 Pine Ave");
    expect(parsed.tool_name).toBe("enrich_property");
    expect(parsed.tool_input).toEqual({ address: "1247 Pine Ave" });
    expect(parsed.tool_output_content).toBe("ok");
    expect(parsed.sources_succeeded).toEqual(["geocoding"]);
    expect(parsed.sources_failed).toEqual(["realie"]);
    expect(parsed.ok).toBe(true);
    expect(parsed.threw).toBeNull();
    expect(parsed.elapsed_ms).toBe(100);
  });

  it("surfaces sources_succeeded + sources_failed even when tool_output_data omits them", () => {
    // Some tool outputs (future tools beyond enrich_property) won't
    // carry sources_*. The logger should default to empty arrays
    // rather than crash or emit `undefined`.
    const { calls } = captureLog();
    logToolResult({
      user_input: "x",
      tool_name: "future_tool",
      tool_input: {},
      tool_output_content: "ok",
      tool_output_data: { something: "else" },
      ok: true,
      threw: null,
      elapsed_ms: 1,
    });
    const parsed = JSON.parse(String(calls[0][0]).split("] ")[1]);
    expect(parsed.sources_succeeded).toEqual([]);
    expect(parsed.sources_failed).toEqual([]);
  });

  it("truncates long user_input and tool_output_content to 500 chars + marker", () => {
    const longUser = "a".repeat(800);
    const longContent = "b".repeat(1200);
    const { calls } = captureLog();
    logToolResult({
      user_input: longUser,
      tool_name: "enrich_property",
      tool_input: { address: "x" },
      tool_output_content: longContent,
      tool_output_data: null,
      ok: true,
      threw: null,
      elapsed_ms: 1,
    });
    const parsed = JSON.parse(String(calls[0][0]).split("] ")[1]);
    // 500 chars + "…[truncated N]" suffix
    expect(parsed.user_input).toMatch(/^a{500}…\[truncated 300\]$/);
    expect(parsed.tool_output_content).toMatch(/^b{500}…\[truncated 700\]$/);
  });

  it("preserves short fields untouched (no truncation)", () => {
    const { calls } = captureLog();
    logToolResult({
      user_input: "1247 Pine",
      tool_name: "enrich_property",
      tool_input: {},
      tool_output_content: "ok",
      tool_output_data: null,
      ok: true,
      threw: null,
      elapsed_ms: 1,
    });
    const parsed = JSON.parse(String(calls[0][0]).split("] ")[1]);
    expect(parsed.user_input).toBe("1247 Pine");
    expect(parsed.tool_output_content).toBe("ok");
  });

  it("preserves null user_input and null tool_output_content as null (no truncate-of-null crash)", () => {
    const { calls } = captureLog();
    logToolResult({
      user_input: null,
      tool_name: "enrich_property",
      tool_input: {},
      tool_output_content: null,
      tool_output_data: null,
      ok: false,
      threw: "ECONNRESET",
      elapsed_ms: 5,
    });
    const parsed = JSON.parse(String(calls[0][0]).split("] ")[1]);
    expect(parsed.user_input).toBeNull();
    expect(parsed.tool_output_content).toBeNull();
    expect(parsed.ok).toBe(false);
    expect(parsed.threw).toBe("ECONNRESET");
  });

  it("captures elapsed_ms verbatim (post-mortem latency signal)", () => {
    const { calls } = captureLog();
    logToolResult({
      user_input: "x",
      tool_name: "enrich_property",
      tool_input: {},
      tool_output_content: "ok",
      tool_output_data: null,
      ok: true,
      threw: null,
      elapsed_ms: 3742,
    });
    const parsed = JSON.parse(String(calls[0][0]).split("] ")[1]);
    expect(parsed.elapsed_ms).toBe(3742);
  });

  it("does not crash when payload contains a circular reference", () => {
    // Defensive: a malformed tool response with a circular ref would
    // throw inside JSON.stringify. The logger catches it and emits a
    // safe envelope instead — the route MUST keep serving requests.
    const circular: Record<string, unknown> = { foo: "bar" };
    circular.self = circular;
    const { calls } = captureLog();
    expect(() =>
      logToolResult({
        user_input: "x",
        tool_name: "enrich_property",
        tool_input: {},
        tool_output_content: "ok",
        tool_output_data: circular,
        ok: true,
        threw: null,
        elapsed_ms: 1,
      }),
    ).not.toThrow();
    const line = String(calls[0][0]);
    expect(line).toMatch(/^\[carbon-chat:tool-result\] /);
    const parsed = JSON.parse(line.split("] ")[1]);
    expect(parsed.log_serialize_error).toBeDefined();
  });
});

/* =========================================================================
 * C.S.1.8 — chat_error PostHog instrumentation
 * ========================================================================= */

describe("POST /api/chat — chat_error analytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(captureServerEvent).mockClear();
  });

  function chatRequest(body: unknown) {
    return new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("emits chat_error on a BAD_REQUEST when ANTHROPIC_API_KEY is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const res = await POST(chatRequest({ messages: [{ role: "user", content: "hi" }] }));

    expect(res.status).toBe(503);
    expect(captureServerEvent).toHaveBeenCalledWith("chat_error", "server-anonymous", {
      error_kind: "BAD_REQUEST",
      tenant_id: "unknown",
    });
  });

  it("emits chat_error carrying the tenant id on an unknown-tenant 400", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");

    const res = await POST(
      chatRequest({ messages: [{ role: "user", content: "hi" }], tenantId: "nope" }),
    );

    expect(res.status).toBe(400);
    expect(captureServerEvent).toHaveBeenCalledWith("chat_error", "server-anonymous", {
      error_kind: "BAD_REQUEST",
      tenant_id: "nope",
    });
  });
});
