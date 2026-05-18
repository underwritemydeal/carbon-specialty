/**
 * Voice client — sprint C.S.1.6.2.
 *
 * Browser-side helper for Carbon's voice UX. Two responsibilities:
 *
 *   1. TTS playback. `playTTS(text)` POSTs to /api/tts, plays the
 *      returned MP3, and resolves when playback finishes (or rejects
 *      on any failure). A single shared <Audio> instance is reused so
 *      starting a new play preempts whatever was playing before — the
 *      chat never overlaps two replies.
 *
 *   2. Web Speech API feature detection. `isSpeechRecognitionSupported()`
 *      runs in the browser only and returns false on the server, so SSR
 *      stays clean.
 *
 * Both helpers fail closed: a missing key or unsupported browser
 * surfaces as a thrown error / `false` return, and the UI degrades
 * gracefully without crashing the chat.
 */

let sharedAudio: HTMLAudioElement | null = null;
let sharedObjectUrl: string | null = null;

function resetSharedAudio() {
  if (sharedAudio) {
    try {
      sharedAudio.pause();
    } catch {
      // ignore
    }
    sharedAudio.src = "";
  }
  if (sharedObjectUrl) {
    URL.revokeObjectURL(sharedObjectUrl);
    sharedObjectUrl = null;
  }
}

/**
 * Fetch + play Carbon's spoken reply. Resolves on the `ended` event;
 * rejects on fetch error, non-200, decode error, or `playbackError`.
 *
 * Always preempts whatever was playing before, so it's safe to fire
 * back-to-back without coordinating cancel logic in the caller.
 */
export async function playTTS(text: string, voice?: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("playTTS called on the server");
  }
  const trimmed = text.trim();
  if (!trimmed) return;

  resetSharedAudio();

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(voice ? { text: trimmed, voice } : { text: trimmed }),
  });
  if (!res.ok) {
    // Surface the kind so callers can log; we don't otherwise care.
    let kind = "UNKNOWN";
    try {
      const body = await res.json();
      if (body && typeof body.error_kind === "string") kind = body.error_kind;
    } catch {
      // ignore — non-JSON error body
    }
    throw new Error(`/api/tts ${res.status} ${kind}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  sharedObjectUrl = url;

  const audio = new Audio(url);
  sharedAudio = audio;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    const onEnded = () => {
      cleanup();
      // Leave sharedAudio alone — a subsequent playTTS() will reset it.
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Audio playback error"));
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.play().catch((e) => {
      cleanup();
      // Most common cause: iOS autoplay block in a text-only session.
      // The caller decides whether to re-prompt with a tap or swallow.
      reject(e);
    });
  });
}

/** Stop any currently-playing TTS. Safe no-op if nothing is playing. */
export function stopTTS(): void {
  if (typeof window === "undefined") return;
  resetSharedAudio();
}

/**
 * Browser support probe for the Web Speech API. iOS Chrome (which uses
 * WebKit but doesn't expose webkitSpeechRecognition) → false. Desktop
 * Safari, desktop Chrome, mobile Safari → true.
 *
 * Runs in the browser only; returns false on the server so SSR
 * snapshots don't render the mic button before hydration.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * Returns the constructor for the platform's SpeechRecognition class.
 * Caller must guard with `isSpeechRecognitionSupported()` first.
 */
export function getSpeechRecognitionCtor(): new () => SpeechRecognitionLike {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) throw new Error("SpeechRecognition not available");
  return Ctor;
}

/**
 * Minimal structural type covering the subset of the spec we use.
 * The DOM lib's `SpeechRecognition` typings are uneven across TS
 * versions; this keeps the call sites strongly typed without pulling
 * a `lib.dom.iterable.d.ts` dependency check.
 */
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string };
    };
  };
}
