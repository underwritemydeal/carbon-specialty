/**
 * Inworld TTS — sprint C.S.1.6.2.
 *
 * Carbon Specialty's only voice-out path. Plays Carbon's chat replies
 * aloud when the user initiated the turn by mic (auto-play) or tapped
 * "LISTEN →" on any Carbon message (manual play).
 *
 * One client lives here. /api/tts is the only consumer. Do not call
 * Inworld from anywhere else — keep the API key server-side, keep the
 * rate-limit and text-sanitization in a single place.
 *
 * Endpoint:        POST https://api.inworld.ai/tts/v1/voice
 * Auth:            Authorization: Basic <INWORLD_API_KEY>  (already base64-encoded)
 * Model:           inworld-tts-1-5-mini   (operator-selected — C.S.1.6.2)
 * Voice:           Reed                   (operator-selected — C.S.1.6.2)
 * Audio out:       MP3, 24 kHz, 64 kbps  (small enough for mobile autoplay)
 * Response:        { audioContent: "<base64 mp3 bytes>", usage: {...} }
 *
 * Returns the decoded MP3 bytes so callers can stream them directly as
 * `Content-Type: audio/mpeg`.
 */

export const INWORLD_TTS_ENDPOINT = "https://api.inworld.ai/tts/v1/voice";
export const INWORLD_MODEL_ID = "inworld-tts-1-5-mini";
export const INWORLD_DEFAULT_VOICE = "Reed";

/** Hard ceiling on per-request input length. Carbon replies are short
 *  by design (1–2 questions per turn) but the wrap-up message is the
 *  longest. 1500 chars covers it with headroom; anything beyond is
 *  silently truncated so a runaway model output can't drive a multi-
 *  dollar TTS call. */
export const INWORLD_MAX_TEXT_CHARS = 1500;

export interface InworldTTSError {
  kind: "config" | "auth" | "rate-limit" | "upstream" | "network" | "bad-shape";
  status: number;
  message: string;
}

export interface InworldTTSResult {
  ok: true;
  audio: Uint8Array;
  bytes: number;
  model: string;
  voice: string;
}

/**
 * Calls Inworld TTS and returns decoded MP3 bytes. Strips control
 * sentinels and clamps overly long inputs before dispatch so the
 * caller doesn't have to worry about it.
 *
 * Throws an InworldTTSError-shaped object so the route can map kinds
 * directly onto HTTP status codes.
 */
export async function synthesizeWithInworld(
  text: string,
  options: { voice?: string } = {},
): Promise<InworldTTSResult> {
  const apiKey = process.env.INWORLD_API_KEY;
  if (!apiKey) {
    throw {
      kind: "config",
      status: 503,
      message: "INWORLD_API_KEY not configured",
    } satisfies InworldTTSError;
  }

  const cleaned = sanitizeTtsText(text);
  if (!cleaned) {
    throw {
      kind: "bad-shape",
      status: 400,
      message: "Empty text after sanitization",
    } satisfies InworldTTSError;
  }

  const voice = (options.voice ?? INWORLD_DEFAULT_VOICE).trim() || INWORLD_DEFAULT_VOICE;

  let res: Response;
  try {
    res = await fetch(INWORLD_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleaned,
        voiceId: voice,
        modelId: INWORLD_MODEL_ID,
        audioConfig: {
          audioEncoding: "MP3",
          sampleRateHertz: 24000,
          bitRate: 64000,
        },
      }),
    });
  } catch (e) {
    throw {
      kind: "network",
      status: 502,
      message: e instanceof Error ? e.message : String(e),
    } satisfies InworldTTSError;
  }

  if (res.status === 401 || res.status === 403) {
    throw {
      kind: "auth",
      status: 503,
      message: `Inworld auth failed (HTTP ${res.status})`,
    } satisfies InworldTTSError;
  }
  if (res.status === 429) {
    throw {
      kind: "rate-limit",
      status: 429,
      message: "Inworld rate-limited",
    } satisfies InworldTTSError;
  }
  if (!res.ok) {
    throw {
      kind: "upstream",
      status: 502,
      message: `Inworld returned HTTP ${res.status}`,
    } satisfies InworldTTSError;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw {
      kind: "bad-shape",
      status: 502,
      message: "Inworld returned non-JSON body",
    } satisfies InworldTTSError;
  }

  const audioContent =
    data && typeof data === "object"
      ? (data as { audioContent?: unknown }).audioContent
      : null;
  if (typeof audioContent !== "string" || audioContent.length === 0) {
    throw {
      kind: "bad-shape",
      status: 502,
      message: "Inworld response missing audioContent",
    } satisfies InworldTTSError;
  }

  const audio = decodeBase64(audioContent);
  return { ok: true, audio, bytes: audio.length, model: INWORLD_MODEL_ID, voice };
}

/**
 * Strip control sentinels, collapse whitespace, and clamp length. The
 * wrap-up sentinel ("I have what a specialist needs to start.") is the
 * one Carbon-specific bit we MUST scrub — auto-play would read it aloud
 * and break the conversation's flow.
 */
export function sanitizeTtsText(input: string): string {
  if (!input) return "";
  const stripped = input
    // Hard sentinel — full sentence we never want spoken.
    .replace(/I have what a specialist needs to start\.?/g, "")
    // Bracketed stage directions sometimes emit from the model — drop them.
    .replace(/\[[^\]]+\]/g, "")
    // Markdown emphasis / code — read flat.
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length <= INWORLD_MAX_TEXT_CHARS) return stripped;
  // Truncate on a sentence boundary if one exists in the last 200 chars
  // of the window; otherwise hard-cut.
  const cut = stripped.slice(0, INWORLD_MAX_TEXT_CHARS);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (lastStop > INWORLD_MAX_TEXT_CHARS - 200) {
    return cut.slice(0, lastStop + 1).trim();
  }
  return cut.trim();
}

function decodeBase64(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  // Browser fallback — not exercised in the Node runtime but kept for
  // type safety if this module is ever imported client-side.
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
