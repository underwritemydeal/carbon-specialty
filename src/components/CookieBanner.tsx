"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cs_cookie_consent";
type Consent = "accepted" | "rejected" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>("accepted"); // hidden until we know
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Consent;
      setConsent(v ?? null);
    } catch {
      setConsent(null);
    }
  }, []);

  if (!mounted || consent !== null) return null;

  const set = (v: Consent) => {
    try {
      if (v) localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    setConsent(v);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 200,
        maxWidth: 720,
        marginInline: "auto",
        background: "var(--paper)",
        border: "1px solid var(--ink)",
        padding: "20px 24px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 24,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          id="cookie-title"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ember)",
          }}
        >
          Cookies · CCPA
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
          We use cookies for analytics. California residents have the right to opt out of the sale or sharing of personal information.{" "}
          <a href="/privacy" className="link" style={{ borderBottomColor: "var(--ember)" }}>
            Privacy policy
          </a>
          .
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={() => set("rejected")}>
          Reject
        </button>
        <button type="button" className="btn" onClick={() => set("accepted")}>
          Accept
        </button>
      </div>
    </div>
  );
}
