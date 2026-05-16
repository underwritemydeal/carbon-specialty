"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main
      id="main"
      style={{
        padding: "160px var(--gutter)",
        borderBottom: "1px solid var(--ink)",
        minHeight: "60vh",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--err)",
          }}
        >
          Something broke
        </span>
        <h1
          style={{
            margin: "12px 0 24px",
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(40px, 7vw, 72px)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
          }}
        >
          We&apos;ll be right back.
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 18,
            color: "var(--ink-2)",
          }}
        >
          An error came up rendering this page. Try again, or reach a specialist through the Carbon chat or the quote form.
        </p>
        <button onClick={reset} className="btn" style={{ marginTop: 32 }}>
          Try again
        </button>
      </div>
    </main>
  );
}
