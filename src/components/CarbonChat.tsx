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
import { INTAKE_WRAPUP_SENTINEL } from "@/lib/carbon-system-prompt";
import { track } from "@/lib/analytics";

const INITIAL_GREETING = `Hi — I'm Carbon, the AI intake specialist at Carbon Specialty Insurance.

I help building owners and operators get the right specialist on a real estate insurance question. Tell me a little about the building or schedule you're looking at and I'll capture what a specialist needs to start.`;

const INITIAL_MESSAGES: ChatMessage[] = [{ role: "assistant", content: INITIAL_GREETING }];

type Mode = "chat" | "contact-form" | "done";

export function CarbonChat({
  open,
  onClose,
  initialMessage,
  onClearInitial,
}: {
  open: boolean;
  onClose: () => void;
  initialMessage?: string | null;
  onClearInitial?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  // C.S.1.6 — surfaces "looking up property…" in place of the typing-dot
  // label while the most-recent send is in flight AND the user's message
  // looked like it might contain an address. Cleared on every reply.
  const [propertyLookup, setPropertyLookup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const referenceRef = useRef<string>(generateReferenceId());

  // Contact-form fallback state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking, mode]);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      const t = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(t);
    } else {
      previouslyFocused.current?.focus?.();
    }
  }, [open]);

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
      setMessages(history);
      track("cs_chat_user_message", { length: text.length });
      setThinking(true);
      setPropertyLookup(looksLikeAddress(text));

      // Retry the conversational turn ONCE on 5xx/network before falling
      // through to contact-form mode. Auth, bad-shape, and rate-limit
      // errors short-circuit immediately.
      let attempt = 0;
      let result: { text: string; toolsExecuted: string[] } | null = null;
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
      const after: ChatMessage[] = [...history, { role: "assistant", content: reply }];
      setMessages(after);
      setThinking(false);
      setPropertyLookup(false);

      // Wrap-up sentinel detected → run extraction + submit
      if (reply.includes(INTAKE_WRAPUP_SENTINEL) && !submitted) {
        setSubmitted(true);
        track("cs_chat_intake_completed", { reference: referenceRef.current });
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
    [messages, submitted],
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
    const text = input.trim();
    if (!text || thinking || mode !== "chat") return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setMessages(INITIAL_MESSAGES);
    setError(null);
    setSubmitted(false);
    setMode("chat");
    referenceRef.current = generateReferenceId();
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
            <Message key={i} role={m.role} content={m.content} />
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
              <textarea
                id="carbon-chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your reply…"
                rows={1}
                disabled={thinking}
                style={{
                  flex: 1,
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
                }}
              />
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

function Message({ role, content }: { role: "user" | "assistant"; content: string }) {
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
