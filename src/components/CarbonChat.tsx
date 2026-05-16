"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askCarbon, submitLead, type ChatMessage } from "@/lib/covr";
import { extractIntake, looksComplete } from "@/lib/intake-extractor";
import { track } from "@/lib/analytics";

const INITIAL_GREETING = `Hi. I'm Carbon.

Three ways forward:
— Speak with someone on the phone
— Complete a quote form for an indication
— We can discuss what you need right here

Or just tell me about the building and I'll start the intake.`;

const INITIAL_MESSAGES: ChatMessage[] = [{ role: "assistant", content: INITIAL_GREETING }];

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
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

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

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);
      const userMsg: ChatMessage = { role: "user", content: text };
      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      track("cs_chat_user_message", { length: text.length });
      setThinking(true);
      try {
        const reply = await askCarbon(newHistory);
        const after: ChatMessage[] = [...newHistory, { role: "assistant", content: reply }];
        setMessages(after);

        // Try to extract a structured payload and submit a lead if complete.
        const intake = extractIntake(after);
        if (!intakeSubmitted && looksComplete(intake)) {
          setIntakeSubmitted(true);
          track("cs_chat_intake_completed", { hasEmail: Boolean(intake.contactEmail) });
          submitLead({ source: "chat", transcript: after, payload: intake }).then((r) => {
            if (r.ok) track("cs_lead_captured", { route: r.route, source: "chat" });
          });
        }
      } catch {
        setError("Carbon's offline right now. Try the form or call us directly.");
      } finally {
        setThinking(false);
      }
    },
    [messages, intakeSubmitted],
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
    if (!text || thinking) return;
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
    setIntakeSubmitted(false);
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
                AI agent · online
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reset} style={iconBtn} aria-label="Reset conversation" type="button">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 12 A9 9 0 1 0 12 3" />
                <polyline points="3 3 3 9 9 9" />
              </svg>
            </button>
            <button onClick={onClose} style={iconBtn} aria-label="Close" type="button">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
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
              <Typing />
            </div>
          )}
          {error && (
            <div
              role="alert"
              style={{
                padding: "10px 14px",
                border: "1px solid var(--err)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--err)",
                letterSpacing: "0.06em",
              }}
            >
              {error}
            </div>
          )}
        </div>

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
            <label htmlFor="carbon-chat-input" style={{ position: "absolute", left: -9999 }}>
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
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
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
              Synced to <span style={{ color: "var(--ember)" }}>Covr</span>
            </span>
          </div>
        </div>
      </aside>
    </>
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

function Typing() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 0" }} aria-label="Carbon is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 6,
            height: 6,
            background: "var(--ink-2)",
            opacity: 0.4,
            animation: `carbon-typing 1.2s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes carbon-typing {
          0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
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
