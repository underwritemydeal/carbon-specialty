"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  askCarbonIntake,
  extractIntakePayload,
  submitIntake,
  buildIntakePayload,
  generateReferenceId,
  ChatError,
  type ChatMessage,
  type CarbonContactPayload,
} from "@/lib/carbon-intake";
import type { PropertyFacts } from "@/lib/property-facts";
import { carbonSpecialtyConfig } from "@/lib/tenants/carbon-specialty";
import { loadGooglePlaces } from "@/lib/google-places-loader";
import {
  getSpeechRecognitionCtor,
  isSpeechRecognitionSupported,
  playTTS,
  stopTTS,
  type SpeechRecognitionLike,
} from "@/lib/voice-client";
import { track } from "@/lib/analytics";
import { usePostHog } from "posthog-js/react";

const INITIAL_GREETING = `Hi — I'm Carbon, the AI intake specialist at Carbon Specialty Insurance.

I help building owners and operators get the right specialist on a real estate insurance question. Tell me a little about the building or schedule you're looking at and I'll capture what a specialist needs to start.`;

const INITIAL_MESSAGES: ChatMessage[] = [{ role: "assistant", content: INITIAL_GREETING }];

/** Wrap-up sentinel — sourced from the tenant config as of C.S.1.6.5
 *  (was a named export of the now-removed carbon-system-prompt.ts). */
const INTAKE_WRAPUP_SENTINEL = carbonSpecialtyConfig.agent.wrapUpSentinel;

/** Tenant id stamped on every C.S.1.8 PostHog event. The chat is
 *  single-tenant today; this is the one place to widen later. */
const TENANT_ID = carbonSpecialtyConfig.id;

/** Detects whether an assistant reply is a hard-handoff routing
 *  message and, if so, which trigger fired. Matches the leading clause
 *  of each trigger's configured `specialistMessage` (the builder
 *  instructs the model to say it). Returns the trigger id or null.
 *
 *  Heuristic by nature — if the model heavily paraphrases the routing
 *  line this returns null and `handoff_triggered` simply isn't sent. */
function detectHandoffTriggerId(reply: string): string | null {
  for (const trigger of carbonSpecialtyConfig.intake.hardHandoffTriggers) {
    const leadClause = trigger.specialistMessage.split(/[.—]/)[0].trim();
    if (leadClause.length >= 15 && reply.includes(leadClause)) {
      return trigger.id;
    }
  }
  return null;
}

type Mode = "chat" | "contact-form" | "done";

export function CarbonChat({
  open,
  onClose,
  initialMessage,
  onClearInitial,
  inline = false,
}: {
  open: boolean;
  onClose: () => void;
  initialMessage?: string | null;
  onClearInitial?: () => void;
  /** C.S.2.0 — render as an embedded console inside the hero (>768px)
   *  instead of the slide-out aside. Passes `open` is ignored when
   *  inline; the console is always rendered and ready for input. */
  inline?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  // C.S.2.0 — track property facts as they come back from the chat
  // server so the inline console's right-strip Property Summary panel
  // populates turn-by-turn. Same object the chat already produces via
  // the enrich_property tool — we just surface it to the client.
  const [propertyFacts, setPropertyFacts] = useState<PropertyFacts | null>(null);
  // C.S.1.6 — surfaces "looking up property…" in place of the typing-dot
  // label while the most-recent send is in flight AND the user's message
  // looked like it might contain an address. Cleared on every reply.
  const [propertyLookup, setPropertyLookup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const referenceRef = useRef<string>(generateReferenceId());

  // C.S.1.8 — PostHog. `usePostHog()` returns the singleton wired up by
  // PostHogProvider. `handoffFiredRef` keeps `handoff_triggered` to one
  // emit per conversation.
  const posthog = usePostHog();
  const handoffFiredRef = useRef(false);
  const captureEvent = useCallback(
    (event: string, props: Record<string, unknown>) => {
      try {
        // $ip suppresses geo-IP; props carry no PII by contract.
        posthog?.capture?.(event, { ...props, $ip: "0.0.0.0" });
      } catch {
        /* analytics is never load-bearing */
      }
    },
    [posthog],
  );

  // Contact-form fallback state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // C.S.1.6.1 — Places Autocomplete on the first user message only.
  // The widget binds to an <input>, not a <textarea>. We mount a hidden
  // input absolutely positioned over the textarea so the .pac-container
  // anchors to the right bounding box, and sync values bidirectionally.
  // Once the first user message sends, we tear the whole thing down so
  // subsequent intake turns (renewal date, contact info, etc.) don't
  // attempt to autocomplete as addresses.
  const placesInputRef = useRef<HTMLInputElement>(null);
  const placesTeardownRef = useRef<(() => void) | null>(null);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);

  // C.S.1.6.2 — Voice UX. STT via Web Speech API; TTS via /api/tts.
  //
  //   voiceSupported    — null until the browser-side feature probe runs.
  //                       false on iOS Chrome and any non-Webkit/Blink
  //                       browser without SpeechRecognition.
  //   listening         — mic is actively transcribing.
  //   interim           — non-final words from the current recognition pass.
  //                       Rendered over the textarea at opacity 0.6.
  //   voiceTurns        — message indices (user AND assistant) belonging
  //                       to a voice-initiated turn. Carbon replies in this
  //                       set auto-play; replies NOT in it render LISTEN.
  //                       Kept in state (not a ref) so render-time reads
  //                       in the Message list are reactive.
  //   autoPlayedRef     — assistant indices we've already auto-played, so
  //                       a re-render doesn't replay the same line.
  //   manualPlaying     — assistant index currently being played via the
  //                       LISTEN affordance (renders pine while active).
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [manualPlaying, setManualPlaying] = useState<number | null>(null);
  const [voiceTurns, setVoiceTurns] = useState<ReadonlySet<number>>(() => new Set());
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceCommittedRef = useRef<string>("");
  const inputRefForVoice = useRef<string>("");
  const nextTurnVoiceRef = useRef<boolean>(false);
  const autoPlayedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking, mode]);

  // C.S.1.8 — PostHog: fires when the chat panel opens.
  useEffect(() => {
    if (open) captureEvent("chat_opened", { tenant_id: TENANT_ID });
  }, [open, captureEvent]);

  // C.S.1.6.2 — Browser-side feature probe for the Web Speech API.
  // Runs once on mount. We never render the mic button until this
  // resolves to keep the SSR snapshot and the post-hydration UI in
  // sync (SpeechRecognition isn't defined on the server). Effect-as-
  // probe is the correct shape here — we're syncing an external
  // platform capability into React state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceSupported(isSpeechRecognitionSupported());
  }, []);

  // C.S.1.6.2 — Keep a ref of the current input value so the
  // recognition `onresult` handler (which closes over stale state)
  // appends to the live committed text.
  useEffect(() => {
    inputRefForVoice.current = input;
  }, [input]);

  // C.S.1.6.2 — Tear down any active recognition + audio playback when
  // the chat panel closes. Without this, mic stays hot in the background
  // and TTS keeps playing after the user dismisses the panel. Effect-as-
  // cleanup correctly stops the SpeechRecognition + Audio externals; the
  // setState calls just reflect that cleanup back into React.
  useEffect(() => {
    if (open) return;
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    stopTTS();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListening(false);
    setInterim("");
    setManualPlaying(null);
  }, [open]);

  // C.S.1.6.2 — Auto-play TTS for assistant messages that belong to a
  // voice-initiated turn. Fires once per message. Failures (key missing,
  // 503, iOS autoplay block on edge cases) are swallowed silently —
  // voice is a polish layer, not core to the chat working.
  useEffect(() => {
    const last = messages.length - 1;
    if (last < 0) return;
    const m = messages[last];
    if (m.role !== "assistant") return;
    if (!voiceTurns.has(last)) return;
    if (autoPlayedRef.current.has(last)) return;
    autoPlayedRef.current.add(last);
    track("cs_chat_tts_autoplay", { index: last });
    playTTS(m.content).catch((e) => {
      console.warn("[carbon-chat] TTS autoplay failed:", e);
    });
  }, [messages, voiceTurns]);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      const t = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(t);
    } else {
      previouslyFocused.current?.focus?.();
    }
  }, [open]);

  // C.S.1.6.1 — Initialize Places Autocomplete when the chat opens
  // (and only on the first user message). Resolves gracefully to no-op
  // if the key isn't configured or the script fails to load.
  useEffect(() => {
    if (!open || !autocompleteEnabled || mode !== "chat") return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    loadGooglePlaces().then((places) => {
      if (cancelled || !places) return;
      const inputEl = placesInputRef.current;
      const textareaEl = inputRef.current;
      if (!inputEl || !textareaEl) return;

      const ac = new places.Autocomplete(inputEl, {
        types: ["address"],
        componentRestrictions: { country: "us" },
        fields: ["formatted_address", "place_id", "name"],
      });

      const handlePlace = () => {
        const place = ac.getPlace();
        const formatted = place?.formatted_address ?? "";
        if (!formatted) return;
        // Push into the textarea via setInput. No auto-submit.
        setInput(formatted);
        // Refocus the textarea so the user can press Enter to send.
        requestAnimationFrame(() => {
          textareaEl.focus();
          textareaEl.setSelectionRange(formatted.length, formatted.length);
        });
        track("cs_chat_place_selected", { place_id: place?.place_id ?? "" });
      };
      const listener = ac.addListener("place_changed", handlePlace);

      cleanup = () => {
        listener.remove();
        // Remove any .pac-container the widget added (Google appends
        // them to <body> as siblings of the panel).
        document.querySelectorAll(".pac-container").forEach((el) => el.remove());
      };
      placesTeardownRef.current = cleanup;
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      placesTeardownRef.current = null;
    };
  }, [open, autocompleteEnabled, mode]);

  // Mirror textarea value → hidden input so the widget's search term
  // updates as the user types. Programmatically setting .value doesn't
  // trigger the widget; we dispatch an "input" event so it picks up.
  useEffect(() => {
    if (!autocompleteEnabled) return;
    const inputEl = placesInputRef.current;
    if (!inputEl) return;
    if (inputEl.value !== input) {
      inputEl.value = input;
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [input, autocompleteEnabled]);

  // ESC + Tab focus trap
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // -------------------------------------------------------------------------
  // Core: send a message, handle wrap-up sentinel → extract + submit
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      const userMsg: ChatMessage = { role: "user", content: text };
      const history = [...messages, userMsg];
      const userIndex = history.length - 1;
      // C.S.1.6.2 — consume the voice flag for THIS turn (set by send()
      // when the textarea contained mic-derived text). The assistant's
      // reply index gets added once we know it.
      const voiceTurn = nextTurnVoiceRef.current;
      nextTurnVoiceRef.current = false;
      if (voiceTurn) {
        setVoiceTurns((prev) => {
          const next = new Set(prev);
          next.add(userIndex);
          return next;
        });
      }
      setMessages(history);
      track("cs_chat_user_message", { length: text.length, voice: voiceTurn });
      setThinking(true);
      // C.S.1.8 — PostHog `address_submitted` fires on the same
      // address-detection condition that drives the lookup status line.
      const isAddress = looksLikeAddress(text);
      setPropertyLookup(isAddress);
      if (isAddress) captureEvent("address_submitted", { tenant_id: TENANT_ID });

      // C.S.1.6.1 — autocomplete is intake-address-only. After the
      // first user message, tear it down so renewal-date / contact
      // turns don't get address-completion suggestions.
      if (autocompleteEnabled) {
        if (placesTeardownRef.current) placesTeardownRef.current();
        placesTeardownRef.current = null;
        setAutocompleteEnabled(false);
      }

      // Retry the conversational turn ONCE on 5xx/network before falling
      // through to contact-form mode. Auth, bad-shape, and rate-limit
      // errors short-circuit immediately.
      let attempt = 0;
      let result: { text: string; toolsExecuted: string[]; propertyFacts?: PropertyFacts } | null = null;
      while (attempt < 2 && result === null) {
        try {
          result = await askCarbonIntake(history);
        } catch (e) {
          if (e instanceof ChatError) {
            if (e.kind === "auth" || e.kind === "bad-shape" || e.kind === "rate-limit") {
              // Won't fix on retry — fall through immediately.
              setMode("contact-form");
              setThinking(false);
              setPropertyLookup(false);
              track("cs_chat_fallback_mode", { reason: e.kind });
              return;
            }
            // network / server / tool-fail — retry once
            if (attempt === 0) {
              attempt += 1;
              await new Promise((r) => setTimeout(r, 600));
              continue;
            }
            setMode("contact-form");
            setThinking(false);
            setPropertyLookup(false);
            track("cs_chat_fallback_mode", { reason: e.kind });
            return;
          }
          // Unknown error type — fall through too
          setMode("contact-form");
          setThinking(false);
          setPropertyLookup(false);
          return;
        }
      }
      if (result == null) {
        setMode("contact-form");
        setThinking(false);
        setPropertyLookup(false);
        return;
      }

      const reply = result.text;
      // C.S.2.0 — capture freshly enriched property facts so the
      // inline console's Property Summary panel re-renders with the
      // new values. We only overwrite when the server returned facts
      // on this turn (a turn without enrich_property leaves prior
      // facts in place).
      if (result.propertyFacts) {
        setPropertyFacts(result.propertyFacts);
      }
      const after: ChatMessage[] = [...history, { role: "assistant", content: reply }];
      // C.S.1.6.2 — mark the assistant index as part of the voice turn
      // BEFORE setMessages so the auto-play effect (which depends on
      // both `messages` and `voiceTurns`) sees the flag set when it
      // observes the new message.
      if (voiceTurn) {
        const assistantIndex = after.length - 1;
        setVoiceTurns((prev) => {
          const next = new Set(prev);
          next.add(assistantIndex);
          return next;
        });
      }
      setMessages(after);
      setThinking(false);
      setPropertyLookup(false);

      // C.S.1.8 — PostHog: hard-handoff routing detected in the reply.
      // Once per conversation.
      const handoffId = detectHandoffTriggerId(reply);
      if (handoffId && !handoffFiredRef.current) {
        handoffFiredRef.current = true;
        captureEvent("handoff_triggered", {
          tenant_id: TENANT_ID,
          trigger_id: handoffId,
        });
      }

      // Wrap-up sentinel detected → run extraction + submit
      if (reply.includes(INTAKE_WRAPUP_SENTINEL) && !submitted) {
        setSubmitted(true);
        track("cs_chat_intake_completed", { reference: referenceRef.current });
        captureEvent("intake_completed", {
          tenant_id: TENANT_ID,
          reference_id: referenceRef.current,
        });
        try {
          const extracted = await extractIntakePayload(after);
          const payload = buildIntakePayload(extracted, after, referenceRef.current);
          const result = await submitIntake(payload);
          if (result.ok) {
            track("cs_lead_captured", { route: result.route, source: "chat" });
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                content: `Submission received. A specialist will review and reach out within one business day.\n\nReference: ${referenceRef.current}.\n\nYou can close this window.`,
              },
            ]);
            setMode("done");
          } else {
            // Resend itself failed
            setError(
              "Something went wrong submitting — please email hello@carbonspecialty.com directly with your inquiry.",
            );
            console.error("Carbon intake submit failed:", result);
          }
        } catch (e) {
          // Extraction or submit threw — graceful fallback
          console.error("Carbon intake extraction failed:", e);
          setError(
            "Something went wrong submitting — please email hello@carbonspecialty.com directly with your inquiry.",
          );
        }
      }
    },
    [messages, submitted, captureEvent],
  );

  // Auto-send the initial message from the hero input
  useEffect(() => {
    if (!open || !initialMessage) return;
    const text = initialMessage.trim();
    if (!text) return;
    sendMessage(text);
    onClearInitial?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMessage]);

  const send = () => {
    // If the mic is hot when the user hits send, stop recording first
    // so the final transcript flushes into `input` before we read it.
    if (listening) stopListening();
    const text = (listening ? `${input}${interim ? " " + interim : ""}` : input).trim();
    if (!text || thinking || mode !== "chat") return;
    setInput("");
    setInterim("");
    sendMessage(text);
  };

  // -------------------------------------------------------------------------
  // C.S.1.6.2 — Voice input (Web Speech API). Tap mic to start, tap again
  // to stop. Continuous + interim results. We never auto-submit; the user
  // reviews and presses send.
  // -------------------------------------------------------------------------
  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // ignore — Webkit throws if stop() races with onend
    }
  }, []);

  const startListening = useCallback(() => {
    if (listening) return;
    if (!isSpeechRecognitionSupported()) return;
    let Ctor: new () => SpeechRecognitionLike;
    try {
      Ctor = getSpeechRecognitionCtor();
    } catch {
      setVoiceSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    voiceCommittedRef.current = inputRefForVoice.current;

    rec.onresult = (event) => {
      let nextInterim = "";
      let appended = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) appended += transcript;
        else nextInterim += transcript;
      }
      if (appended) {
        const base = voiceCommittedRef.current;
        const next = `${base}${base && !base.endsWith(" ") ? " " : ""}${appended}`.trim();
        voiceCommittedRef.current = next;
        setInput(next);
        inputRefForVoice.current = next;
      }
      setInterim(nextInterim.trim());
    };
    rec.onerror = (event) => {
      // "no-speech" / "aborted" are routine — silent. Everything else logs.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("[carbon-chat] STT error:", event.error, event.message);
      }
    };
    rec.onend = () => {
      // Commit any trailing interim to the input, then drop state.
      // Functional setter so we read the live interim, not a stale
      // closure from when the recognition started.
      setInterim((current) => {
        if (current.trim().length > 0) {
          const base = voiceCommittedRef.current;
          const next = `${base}${base && !base.endsWith(" ") ? " " : ""}${current}`.trim();
          voiceCommittedRef.current = next;
          setInput(next);
          inputRefForVoice.current = next;
        }
        return "";
      });
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
    } catch (e) {
      console.warn("[carbon-chat] STT start failed:", e);
      return;
    }
    recognitionRef.current = rec;
    setListening(true);
    // C.S.1.6.2 — every send made while the mic is hot, or made from
    // text the mic committed, counts as a voice turn so Carbon's reply
    // auto-plays. Reset on send().
    nextTurnVoiceRef.current = true;
    track("cs_chat_mic_start");
  }, [listening]);

  const toggleMic = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // -------------------------------------------------------------------------
  // C.S.1.6.2 — Manual "LISTEN →" playback for text-initiated assistant
  // messages. Tap-to-play; replaces any audio currently playing.
  // -------------------------------------------------------------------------
  const playMessage = useCallback(async (index: number, content: string) => {
    setManualPlaying(index);
    track("cs_chat_tts_manual", { index });
    try {
      await playTTS(content);
    } catch (e) {
      console.warn("[carbon-chat] TTS manual play failed:", e);
    } finally {
      setManualPlaying((curr) => (curr === index ? null : curr));
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    if (listening) stopListening();
    stopTTS();
    setMessages(INITIAL_MESSAGES);
    setError(null);
    setSubmitted(false);
    setMode("chat");
    setInterim("");
    setManualPlaying(null);
    setVoiceTurns(new Set());
    autoPlayedRef.current = new Set();
    nextTurnVoiceRef.current = false;
    handoffFiredRef.current = false;
    referenceRef.current = generateReferenceId();
    // Reset fully — including the first-message autocomplete.
    setAutocompleteEnabled(true);
    // C.S.2.0 — clear extracted property facts so the inline summary
    // panel returns to its empty "—" state on a fresh conversation.
    setPropertyFacts(null);
  };

  // -------------------------------------------------------------------------
  // Contact-form mode submit — single shot to lead-fallback
  // -------------------------------------------------------------------------
  const submitContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactSubmitting) return;
    setContactSubmitting(true);
    setError(null);
    const payload: CarbonContactPayload = {
      source: "carbon_specialty_website_contact_form",
      reference_id: referenceRef.current,
      submitted_at: new Date().toISOString(),
      name: contactName.trim() || undefined,
      email: contactEmail.trim() || undefined,
      note: contactNote.trim() || undefined,
    };
    try {
      const result = await submitIntake(payload);
      if (result.ok) {
        track("cs_lead_captured", { route: result.route, source: "contact-form" });
        setMode("done");
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `Thanks — a specialist will reach out within one business day.\n\nReference: ${referenceRef.current}.\n\nYou can close this window.`,
          },
        ]);
      } else {
        setError(
          "Something went wrong submitting — please email hello@carbonspecialty.com directly with your inquiry.",
        );
      }
    } catch (err) {
      console.error("Carbon contact-form submit failed:", err);
      setError(
        "Something went wrong submitting — please email hello@carbonspecialty.com directly with your inquiry.",
      );
    } finally {
      setContactSubmitting(false);
    }
  };

  // ===========================================================================
  // C.S.2.0 — Inline console render path. When `inline=true` the chat
  // is embedded inside the hero's right column rather than rendered as
  // a slide-out aside. No backdrop, no slide animation, no close
  // button; a Property Summary side strip lives to the right of the
  // chat column and populates as enrich_property returns data.
  // ===========================================================================
  if (inline) {
    return (
      <div className="cs-console" role="region" aria-label="Property intake console">
        <header className="cs-console__head">
          <div className="cs-console__head-left">
            <span className="cs-console__title">Property Intake</span>
            <span className="cs-console__sub">Quote started · Specialist review next</span>
          </div>
          <div className="cs-console__head-right">
            <PinePulseDot />
            <span className="cs-console__secure">Secure session</span>
          </div>
        </header>

        <div className="cs-console__body">
          {/* Chat column — messages + input */}
          <div className="cs-console__chat">
            <div
              ref={scrollRef}
              className="cs-console__messages"
            >
              {messages.map((m, i) => (
                <ConsoleMessage key={i} role={m.role} content={m.content} />
              ))}
              {thinking && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#4A8F68",
                    }}
                  >
                    Carbon
                  </span>
                  {propertyLookup && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "rgba(244,241,234,0.6)",
                      }}
                    >
                      Looking up property…
                    </span>
                  )}
                  <Typing />
                </div>
              )}
              {error && (
                <div role="alert" className="cs-console__error">{error}</div>
              )}

              {mode === "contact-form" && (
                <ContactForm
                  name={contactName}
                  email={contactEmail}
                  note={contactNote}
                  submitting={contactSubmitting}
                  onName={setContactName}
                  onEmail={setContactEmail}
                  onNote={setContactNote}
                  onSubmit={submitContactForm}
                />
              )}
            </div>

            {mode === "chat" && (
              <div className="cs-console__input-area">
                <div className="cs-console__secure-line">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  <span>Secure &amp; confidential</span>
                </div>
                <div className="cs-console__input-row">
                  <label htmlFor="cs-console-input" className="sr-only">Reply</label>
                  <div style={{ position: "relative", flex: 1 }}>
                    <textarea
                      id="cs-console-input"
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your answer..."
                      rows={2}
                      disabled={thinking}
                      className="cs-console__textarea"
                      style={
                        listening && interim
                          ? { color: "transparent", caretColor: "var(--paper)" }
                          : undefined
                      }
                    />
                    {listening && interim && (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          padding: "10px 0",
                          fontFamily: "var(--font-body)",
                          fontSize: 14,
                          lineHeight: 1.45,
                          color: "var(--paper)",
                          pointerEvents: "none",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {input}
                        {input && !input.endsWith(" ") ? " " : ""}
                        <span style={{ opacity: 0.6 }}>{interim}</span>
                      </div>
                    )}
                    {autocompleteEnabled && (
                      <input
                        ref={placesInputRef}
                        type="text"
                        aria-hidden="true"
                        tabIndex={-1}
                        autoComplete="off"
                        name="carbon-places-shadow"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          pointerEvents: "none",
                          border: 0,
                          padding: 0,
                          margin: 0,
                        }}
                      />
                    )}
                  </div>
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      disabled={thinking}
                      aria-label={listening ? "Stop dictation" : "Dictate your reply"}
                      aria-pressed={listening}
                      className="cs-console__mic"
                      data-listening={listening ? "true" : "false"}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill={listening ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={listening ? 0 : 1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <rect x="9" y="3" width="6" height="12" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth={1.5} />
                        <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth={1.5} />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={send}
                    disabled={!input.trim() || thinking}
                    aria-label="Send message"
                    className="cs-console__send"
                    data-armed={input.trim() && !thinking ? "true" : "false"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <polyline points="14 6 20 12 14 18" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Property Summary side panel */}
          <PropertySummaryPanel facts={propertyFacts} />
        </div>

        <ConsoleStyles />
      </div>
    );
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(11,11,12,0.6)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity var(--dur-med) var(--ease)",
          zIndex: 90,
        }}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="carbon-chat-title"
        aria-hidden={!open}
        className="carbon-chat-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px, 100vw)",
          background: "var(--paper)",
          borderLeft: "1px solid var(--ink)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform var(--dur-med) var(--ease)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* C.S.1.10 — Full-screen takeover on mobile (≤480px). Inline
            styles above set the desktop slide-out panel (520px wide,
            anchored right). The CSS below overrides them at the
            mobile breakpoint with !important so the panel becomes a
            true takeover: inset 0, 100dvh (stable across iOS
            address-bar collapse/expand), no left border, full-width
            slide-up instead of slide-from-right. */}
        <style>{`
          @media (max-width: 480px) {
            .carbon-chat-panel {
              top: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100vw !important;
              height: 100dvh !important;
              border-left: 0 !important;
              transform: ${open ? "translateY(0) !important" : "translateY(100%) !important"};
            }
          }
        `}</style>
        <header
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span aria-hidden style={{ width: 8, height: 8, background: "var(--ember)" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                id="carbon-chat-title"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  lineHeight: 1,
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                Carbon
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                }}
              >
                {mode === "contact-form" ? "Specialist follow-up" : "AI intake · online"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} style={iconBtn} aria-label="Reset conversation" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 12 A9 9 0 1 0 12 3" />
                <polyline points="3 3 3 9 9 9" />
              </svg>
            </button>
            <button onClick={onClose} style={iconBtn} aria-label="Close" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="5" x2="19" y2="19" />
                <line x1="19" y1="5" x2="5" y2="19" />
              </svg>
            </button>
          </div>
        </header>

        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {messages.map((m, i) => (
            <Message
              key={i}
              role={m.role}
              content={m.content}
              // LISTEN affordance: every Carbon message that wasn't
              // already part of a voice turn (i.e. text-initiated).
              // TTS support is gated on voiceSupported !== false so the
              // affordance still appears on iOS Chrome (TTS works even
              // when STT doesn't); we only hide it if /api/tts has
              // definitively failed via the manualPlaying path.
              showListen={
                m.role === "assistant" && !voiceTurns.has(i) && voiceSupported !== null
              }
              playing={manualPlaying === i}
              onListen={() => playMessage(i, m.content)}
            />
          ))}
          {thinking && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ember)",
                }}
              >
                Carbon
              </span>
              {propertyLookup && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    color: "var(--ink-2)",
                  }}
                >
                  Looking up property…
                </span>
              )}
              <Typing />
            </div>
          )}
          {error && (
            <div
              role="alert"
              style={{
                padding: "10px 14px",
                border: "1px solid var(--err)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--err)",
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {mode === "contact-form" && (
            <ContactForm
              name={contactName}
              email={contactEmail}
              note={contactNote}
              submitting={contactSubmitting}
              onName={setContactName}
              onEmail={setContactEmail}
              onNote={setContactNote}
              onSubmit={submitContactForm}
            />
          )}
        </div>

        {mode === "chat" && (
          <div style={{ borderTop: "1px solid var(--ink)", padding: "16px 28px 20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                borderBottom: "1px solid var(--ink)",
                paddingBottom: 12,
              }}
            >
              <label htmlFor="carbon-chat-input" className="sr-only">
                Reply
              </label>
              <div style={{ position: "relative", flex: 1 }}>
                <textarea
                  id="carbon-chat-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    autocompleteEnabled
                      ? "Type a building address — or your reply…"
                      : "Type your reply…"
                  }
                  rows={1}
                  disabled={thinking}
                  style={{
                    width: "100%",
                    resize: "none",
                    border: 0,
                    outline: "none",
                    background: "transparent",
                    padding: "8px 0",
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    lineHeight: 1.4,
                    color: "var(--ink)",
                    minHeight: 24,
                    maxHeight: 160,
                    // While interim transcript is in flight, mask the
                    // textarea's own text — the overlay below renders
                    // the committed input plus the interim portion at
                    // opacity 0.6. Caret-color stays ink so the cursor
                    // is still visible.
                    ...(listening && interim
                      ? { color: "transparent", caretColor: "var(--ink)" as const }
                      : {}),
                  }}
                />
                {/* C.S.1.6.2 — Interim transcript overlay. Mirrors the
                    textarea geometry exactly so the committed text
                    aligns under-glass; the interim portion renders at
                    opacity 0.6 to read as a not-yet-committed preview. */}
                {listening && interim && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      padding: "8px 0",
                      fontFamily: "var(--font-body)",
                      fontSize: 15,
                      lineHeight: 1.4,
                      color: "var(--ink)",
                      pointerEvents: "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {input}
                    {input && !input.endsWith(" ") ? " " : ""}
                    <span style={{ opacity: 0.6 }}>{interim}</span>
                  </div>
                )}
                {/* C.S.1.6.1 — Places Autocomplete attaches to <input>
                    only. Hidden input sized to the textarea so the
                    .pac-container anchors at the right bounding box. */}
                {autocompleteEnabled && (
                  <input
                    ref={placesInputRef}
                    type="text"
                    aria-hidden="true"
                    tabIndex={-1}
                    autoComplete="off"
                    name="carbon-places-shadow"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      pointerEvents: "none",
                      border: 0,
                      padding: 0,
                      margin: 0,
                    }}
                  />
                )}
              </div>
              {/* C.S.1.6.2 — Mic button (Web Speech API). Renders only
                  after the browser-side probe confirms support, so the
                  SSR snapshot never paints a control the runtime can't
                  honor. Ink stroke at rest, pine fill when active. */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={thinking}
                  aria-label={listening ? "Stop dictation" : "Dictate your reply"}
                  aria-pressed={listening}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 38,
                    height: 38,
                    padding: 0,
                    border: `1px solid ${listening ? "var(--ember)" : "var(--ink)"}`,
                    background: listening ? "var(--ember)" : "transparent",
                    color: listening ? "var(--paper)" : "var(--ink)",
                    cursor: thinking ? "not-allowed" : "pointer",
                    borderRadius: 0,
                    transition:
                      "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={listening ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={listening ? 0 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="9" y="3" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeWidth={1.5} />
                    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth={1.5} />
                  </svg>
                </button>
              )}
              <button
                onClick={send}
                disabled={!input.trim() || thinking}
                type="button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  border: "1px solid var(--ink)",
                  background: input.trim() && !thinking ? "var(--ink)" : "transparent",
                  color: input.trim() && !thinking ? "var(--paper)" : "var(--ink-3)",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: input.trim() && !thinking ? "pointer" : "not-allowed",
                  borderRadius: 0,
                }}
              >
                Send
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <polyline points="14 6 20 12 14 18" />
                </svg>
              </button>
            </div>
            {/* C.S.1.6.2 — Unsupported-browser caption. Primarily iOS
                Chrome, which uses WebKit but doesn't expose
                webkitSpeechRecognition. Renders only after the probe
                has run, so it never flashes during hydration. */}
            {voiceSupported === false && (
              <div
                style={{
                  marginTop: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                }}
              >
                Voice input — Safari or Chrome desktop
              </div>
            )}
            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              <span>↵ to send · ⇧↵ for newline</span>
              <span>
                <span style={{ color: "var(--ember)" }}>Specialist</span> reviews every submission
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function ContactForm({
  name,
  email,
  note,
  submitting,
  onName,
  onEmail,
  onNote,
  onSubmit,
}: {
  name: string;
  email: string;
  note: string;
  submitting: boolean;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onNote: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      aria-label="Contact form"
      style={{
        marginTop: 4,
        padding: "20px",
        border: "1px solid var(--ink)",
        background: "var(--paper-2)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--ember)",
        }}
      >
        Specialist follow-up
      </span>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-body)",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--ink-2)",
        }}
      >
        The AI intake is offline at the moment. Leave your name, email, and a brief note and a Carbon specialist will respond directly within one business day.
      </p>

      <FormField label="Name" id="cf-name" value={name} onChange={onName} placeholder="Your name" />
      <FormField label="Email" id="cf-email" type="email" value={email} onChange={onEmail} placeholder="you@example.com" required />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="cf-note"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          Brief note
        </label>
        <textarea
          id="cf-note"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          rows={3}
          placeholder="Asset type, city, what you're looking for…"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--ink)",
            background: "var(--paper)",
            border: "1px solid var(--ink)",
            padding: "10px 12px",
            outline: "none",
            resize: "vertical",
            minHeight: 80,
          }}
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !email.trim()}
        style={{
          alignSelf: "flex-start",
          padding: "12px 18px",
          border: "1px solid var(--ink)",
          background: submitting || !email.trim() ? "transparent" : "var(--ink)",
          color: submitting || !email.trim() ? "var(--ink-3)" : "var(--paper)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          cursor: submitting || !email.trim() ? "not-allowed" : "pointer",
        }}
      >
        {submitting ? "Sending…" : "Send to specialist →"}
      </button>
    </form>
  );
}

function FormField({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 15,
          color: "var(--ink)",
          background: "var(--paper)",
          border: "1px solid var(--ink)",
          padding: "10px 12px",
          outline: "none",
        }}
      />
    </div>
  );
}

function Message({
  role,
  content,
  showListen = false,
  playing = false,
  onListen,
}: {
  role: "user" | "assistant";
  content: string;
  showListen?: boolean;
  playing?: boolean;
  onListen?: () => void;
}) {
  const isAgent = role === "assistant";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: isAgent ? "flex-start" : "flex-end",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: isAgent ? "var(--ember)" : "var(--ink-3)",
        }}
      >
        {isAgent ? "Carbon" : "You"}
      </span>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 15,
          lineHeight: 1.5,
          maxWidth: "85%",
          padding: isAgent ? 0 : "10px 14px",
          background: isAgent ? "transparent" : "var(--ink)",
          color: isAgent ? "var(--ink)" : "var(--paper)",
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </div>
      {/* C.S.1.6.2 — LISTEN affordance for text-initiated Carbon
          messages. Tap to play the Inworld TTS rendering. Pine while
          playing so the playback state is visible at a glance. */}
      {isAgent && showListen && onListen && (
        <button
          type="button"
          onClick={onListen}
          disabled={playing}
          aria-label={playing ? "Playing audio" : "Listen to this message"}
          style={{
            marginTop: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
            background: "transparent",
            border: 0,
            color: playing ? "var(--ember)" : "var(--ink-3)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            cursor: playing ? "default" : "pointer",
            transition: "color var(--dur-fast) var(--ease)",
          }}
        >
          {playing ? "Playing…" : "Listen →"}
        </button>
      )}
    </div>
  );
}

/** Heuristic: does this user message read like it contains a property
 *  address? Used only to surface the "looking up property…" status
 *  line while the chat is waiting on Anthropic. False negatives are
 *  fine — the chat still works either way. */
function looksLikeAddress(text: string): boolean {
  // A street number + a word is the strongest signal.
  if (/\b\d{1,6}\s+[A-Za-z]/.test(text)) return true;
  // City/state hint: a word followed by a 2-letter US state code.
  if (/[A-Za-z]+,?\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i.test(text)) {
    return true;
  }
  // A 5-digit ZIP near the end of a short message.
  if (text.length < 200 && /\b\d{5}(?:-\d{4})?\b/.test(text)) return true;
  return false;
}

function Typing() {
  return (
    <div
      style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 0" }}
      aria-label="Carbon is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="carbon-typing-dot"
          style={{
            width: 6,
            height: 6,
            background: "var(--ember)",
            opacity: 0.4,
            animation: `carbon-typing 1.2s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes carbon-typing {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .carbon-typing-dot { animation: none !important; opacity: 0.7 !important; }
        }
      `}</style>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  background: "transparent",
  border: "1px solid var(--ink)",
  color: "var(--ink)",
  cursor: "pointer",
  borderRadius: 0,
};

/* ============================================================================
 * C.S.2.0 — Inline console helpers
 *
 * `ConsoleMessage` is the inline-mode message renderer. Carbon replies
 * are flat-typography (no bubble); user replies sit in a pine-tint
 * rounded bubble right-aligned. No timestamps for now — keeps the
 * console clean. `PropertySummaryPanel` renders the right strip and
 * derives fields from PropertyFacts (flat + grouped). `PinePulseDot`
 * is the secure-session indicator. `ConsoleStyles` is a single
 * <style> block scoped via classnames; rendered inside the console so
 * it travels with the component.
 * ============================================================================ */

function ConsoleMessage({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isAgent = role === "assistant";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: isAgent ? "flex-start" : "flex-end",
      }}
    >
      {isAgent ? (
        <div className="cs-console__msg cs-console__msg--agent">{content}</div>
      ) : (
        <div className="cs-console__msg cs-console__msg--user">{content}</div>
      )}
    </div>
  );
}

function PinePulseDot() {
  return (
    <span aria-hidden className="cs-console__pulse">
      <style>{`
        .cs-console__pulse {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4A8F68;
          animation: cs-console-pulse 2s ease-in-out infinite;
        }
        @keyframes cs-console-pulse {
          0%   { opacity: 1; }
          50%  { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cs-console__pulse { animation: none; opacity: 1; }
        }
      `}</style>
    </span>
  );
}

function PropertySummaryPanel({ facts }: { facts: PropertyFacts | null }) {
  // Pull values from both the flat fields (legacy) and grouped sections
  // (county-direct). Building-section values take precedence when
  // present because they're the source the flat fields are derived from.
  const propertyType =
    facts?.building?.use_desc ??
    facts?.land_use_desc ??
    null;
  const units = facts?.building?.units ?? facts?.units ?? null;
  const yearBuilt = facts?.building?.year_built ?? facts?.year_built ?? null;
  const construction = facts?.building?.construction_type ?? facts?.construction_type ?? null;
  const location = truncateAddress(facts?.canonical_address ?? facts?.query_address ?? null);
  // Occupancy isn't in PropertyFacts today — the panel renders "—"
  // until the intake flow adds it as a separate signal.
  const occupancy: string | null = null;

  const rows: Array<{ label: string; value: string | number | null }> = [
    { label: "Property type", value: propertyType },
    { label: "Units", value: units },
    { label: "Year built", value: yearBuilt },
    { label: "Occupancy", value: occupancy },
    { label: "Location", value: location },
    { label: "Construction", value: construction },
  ];

  return (
    <aside className="cs-console__panel" aria-label="Property summary">
      <div className="cs-console__panel-head">
        <span className="cs-console__panel-title">Property Summary</span>
        <div className="cs-console__panel-status">
          <PinePulseDot />
          <span>In progress</span>
        </div>
      </div>
      <ul className="cs-console__panel-rows">
        {rows.map((r) => (
          <li
            key={r.label}
            className="cs-console__panel-row"
            data-populated={r.value != null && r.value !== "" ? "true" : "false"}
          >
            <span className="cs-console__panel-row-label">{r.label}</span>
            <span className="cs-console__panel-row-value">
              {r.value == null || r.value === "" ? "—" : r.value}
            </span>
          </li>
        ))}
      </ul>
      <div className="cs-console__panel-foot">
        <span>View full summary →</span>
      </div>
    </aside>
  );
}

function truncateAddress(addr: string | null): string | null {
  if (!addr) return null;
  // Drop the trailing ", USA" the geocoder appends, then cap at a
  // reasonable display length so the panel value doesn't wrap to four
  // lines on a long street name.
  const trimmed = addr.replace(/,\s*USA\s*$/i, "").trim();
  if (trimmed.length <= 40) return trimmed;
  return `${trimmed.slice(0, 37)}…`;
}

function ConsoleStyles() {
  return (
    <style>{`
      .cs-console {
        background: #0F1517;
        border: 1px solid rgba(244,241,234,0.12);
        border-radius: 16px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        height: 600px;
        max-height: calc(100svh - 200px);
        overflow: hidden;
      }
      .cs-console__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(244,241,234,0.08);
      }
      .cs-console__head-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .cs-console__title {
        font-family: var(--font-body);
        font-size: 13px;
        color: rgba(244,241,234,0.90);
        line-height: 1;
      }
      .cs-console__sub {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        color: #4A8F68;
        line-height: 1;
      }
      .cs-console__head-right {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(244,241,234,0.50);
      }
      .cs-console__body {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 200px;
        min-height: 0;
      }
      .cs-console__chat {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .cs-console__messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .cs-console__msg {
        font-family: var(--font-body);
        font-size: 14px;
        line-height: 1.5;
        max-width: 85%;
        white-space: pre-wrap;
      }
      .cs-console__msg--agent {
        color: rgba(244,241,234,0.85);
        background: transparent;
        padding: 0;
      }
      .cs-console__msg--user {
        color: var(--paper);
        background: rgba(31,77,56,0.20);
        padding: 10px 14px;
        border-radius: 8px;
      }
      .cs-console__error {
        padding: 10px 14px;
        border: 1px solid var(--err);
        font-family: var(--font-body);
        font-size: 13px;
        color: var(--err);
        line-height: 1.5;
        border-radius: 4px;
      }
      .cs-console__input-area {
        border-top: 1px solid rgba(244,241,234,0.08);
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .cs-console__secure-line {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        align-self: center;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(244,241,234,0.30);
      }
      .cs-console__input-row {
        display: flex;
        align-items: flex-end;
        gap: 10px;
      }
      .cs-console__textarea {
        width: 100%;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        padding: 10px 0;
        font-family: var(--font-body);
        font-size: 14px;
        line-height: 1.45;
        color: var(--paper);
        min-height: 36px;
        max-height: 160px;
      }
      .cs-console__textarea::placeholder {
        color: rgba(244,241,234,0.35);
      }
      .cs-console__mic {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: transparent;
        color: rgba(244,241,234,0.70);
        border: 1px solid rgba(244,241,234,0.20);
        border-radius: 8px;
        cursor: pointer;
        transition: background var(--dur-fast) var(--ease),
                    color var(--dur-fast) var(--ease),
                    border-color var(--dur-fast) var(--ease);
      }
      .cs-console__mic[data-listening="true"] {
        background: var(--ember);
        border-color: var(--ember);
        color: var(--paper);
      }
      .cs-console__send {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: rgba(244,241,234,0.10);
        color: rgba(244,241,234,0.50);
        border: 0;
        border-radius: 50%;
        cursor: not-allowed;
        transition: background var(--dur-fast) var(--ease),
                    color var(--dur-fast) var(--ease);
      }
      .cs-console__send[data-armed="true"] {
        background: var(--ember);
        color: var(--paper);
        cursor: pointer;
      }
      .cs-console__panel {
        border-left: 1px solid rgba(244,241,234,0.08);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        overflow-y: auto;
      }
      .cs-console__panel-head {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 8px;
      }
      .cs-console__panel-title {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(244,241,234,0.40);
      }
      .cs-console__panel-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        color: rgba(244,241,234,0.50);
      }
      .cs-console__panel-rows {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .cs-console__panel-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-left: 8px;
        border-left: 2px solid transparent;
      }
      .cs-console__panel-row[data-populated="true"] {
        border-left-color: var(--ember);
      }
      .cs-console__panel-row-label {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(244,241,234,0.40);
      }
      .cs-console__panel-row-value {
        font-family: var(--font-body);
        font-size: 13px;
        color: rgba(244,241,234,0.90);
        line-height: 1.3;
      }
      .cs-console__panel-foot {
        margin-top: auto;
        padding-top: 12px;
        font-family: var(--font-body);
        font-size: 13px;
        color: rgba(244,241,234,0.60);
        cursor: pointer;
      }

      /* On narrow consoles (e.g. tablet portrait when inline still
         renders), collapse the property panel below the chat. */
      @media (max-width: 900px) {
        .cs-console__body {
          grid-template-columns: 1fr;
        }
        .cs-console__panel {
          border-left: 0;
          border-top: 1px solid rgba(244,241,234,0.08);
        }
      }
    `}</style>
  );
}
