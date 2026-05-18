import { NextResponse } from "next/server";
import {
  synthesizeWithInworld,
  INWORLD_MAX_TEXT_CHARS,
  type InworldTTSError,
} from "@/lib/inworld-tts";

export const runtime = "nodejs";
// TTS calls are short; cap well under the platform default to surface
// hangs as 504s rather than burning the full window.
export const maxDuration = 30;

/**
 * /api/tts — sprint C.S.1.6.2.
 *
 * Speech synthesis for Carbon's chat replies. POST { text: string,
 * voice?: string } → audio/mpeg binary (MP3, 24 kHz, 64 kbps).
 *
 * Triggered by:
 *   1. Auto-play after a voice-initiated chat turn (CarbonChat.tsx,
 *      voiceMode messages).
 *   2. User taps "LISTEN →" under a Carbon message in a text-initiated
 *      session.
 *
 * Graceful-degradation contract:
 *   - Missing INWORLD_API_KEY        → 503 { ok:false, error_kind:"NO_KEY" }.
 *     Client hides LISTEN affordances and skips auto-play.
 *   - Inworld 401/403                → 503 INWORLD_AUTH
 *   - Inworld 429                    → 429 RATE_LIMIT (route's bucket OR upstream)
 *   - Inworld 5xx / network          → 502 INWORLD_UPSTREAM
 *   - Empty/oversized text           → 400 BAD_REQUEST
 *   - Per-IP local rate-limit hit    → 429 RATE_LIMIT
 *
 * The client never crashes on a non-200 — it silently logs and skips
 * playback. Voice is a polish layer; the chat itself stays usable.
 */

type ErrorKind =
  | "BAD_REQUEST"
  | "NO_KEY"
  | "INWORLD_AUTH"
  | "INWORLD_UPSTREAM"
  | "RATE_LIMIT";

interface ErrorEnvelope {
  ok: false;
  error: string;
  error_kind: ErrorKind;
}

// -----------------------------------------------------------------------------
// In-memory per-IP rate limit. Fluid Compute reuses instances across
// concurrent requests within a region, so this gives meaningful
// per-instance protection — not perfect, but enough to keep an abusive
// client from running up the Inworld bill. Caps: 30 calls per 10-min
// rolling window per IP.
// -----------------------------------------------------------------------------

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
const buckets = new Map<string, number[]>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const arr = buckets.get(ip) ?? [];
  // Drop expired entries on read so the map self-trims.
  const live = arr.filter((t) => now - t < RATE_WINDOW_MS);
  if (live.length >= RATE_MAX) {
    buckets.set(ip, live);
    return false;
  }
  live.push(now);
  buckets.set(ip, live);
  return true;
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const text = body && typeof body === "object" ? (body as { text?: unknown }).text : null;
  const voice = body && typeof body === "object" ? (body as { voice?: unknown }).voice : null;
  if (typeof text !== "string" || text.trim().length === 0) {
    return errorJson("Missing `text` string", "BAD_REQUEST", 400);
  }
  if (text.length > INWORLD_MAX_TEXT_CHARS * 4) {
    // Defensive — sanitize will clamp, but reject obvious garbage early.
    return errorJson("Text too long", "BAD_REQUEST", 400);
  }

  const ip = getClientIp(req);
  if (!checkRate(ip)) {
    console.warn("[carbon-tts] RATE_LIMIT", ip);
    return errorJson("TTS rate-limited; try again shortly.", "RATE_LIMIT", 429);
  }

  if (!process.env.INWORLD_API_KEY) {
    console.warn("[carbon-tts] NO_KEY — INWORLD_API_KEY not configured");
    return errorJson("Voice synthesis is not configured.", "NO_KEY", 503);
  }

  try {
    const result = await synthesizeWithInworld(text, {
      voice: typeof voice === "string" ? voice : undefined,
    });
    return new NextResponse(result.audio as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(result.bytes),
        "X-Carbon-Tts-Model": result.model,
        "X-Carbon-Tts-Voice": result.voice,
        // Don't cache — the client picks a fresh voice line every play.
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const err = e as InworldTTSError;
    if (err && typeof err === "object" && typeof err.kind === "string") {
      switch (err.kind) {
        case "config":
          console.warn("[carbon-tts] NO_KEY", err.message);
          return errorJson("Voice synthesis is not configured.", "NO_KEY", 503);
        case "auth":
          console.error("[carbon-tts] INWORLD_AUTH", err.message);
          return errorJson("Voice service authentication failed.", "INWORLD_AUTH", 503);
        case "rate-limit":
          console.warn("[carbon-tts] INWORLD_RATE_LIMIT", err.message);
          return errorJson("Voice service is rate-limited.", "RATE_LIMIT", 429);
        case "bad-shape":
          console.error("[carbon-tts] BAD_SHAPE", err.message);
          return errorJson(err.message || "Bad TTS input", "BAD_REQUEST", err.status ?? 400);
        case "upstream":
        case "network":
        default:
          console.error("[carbon-tts] INWORLD_UPSTREAM", err.message);
          return errorJson("Voice service is having trouble.", "INWORLD_UPSTREAM", 502);
      }
    }
    console.error("[carbon-tts] UNHANDLED", e);
    return errorJson("Voice service is having trouble.", "INWORLD_UPSTREAM", 502);
  }
}

function errorJson(message: string, kind: ErrorKind, status: number) {
  return NextResponse.json<ErrorEnvelope>(
    { ok: false, error: message, error_kind: kind },
    { status },
  );
}
