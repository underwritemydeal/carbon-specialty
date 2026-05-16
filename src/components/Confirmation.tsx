import Link from "next/link";

export function Confirmation({ ref }: { ref?: string }) {
  const reference = ref ?? `CSP-${Math.floor(Math.random() * 9000 + 1000)}-${new Date().getFullYear()}`;
  return (
    <section style={{ padding: "120px var(--gutter)", borderBottom: "1px solid var(--ink)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 48,
            paddingBottom: 24,
            borderBottom: "1px solid var(--ink)",
          }}
        >
          <span aria-hidden style={{ width: 12, height: 12, background: "var(--ember)" }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ember)",
            }}
          >
            Submission received
          </span>
          <span style={{ flex: 1, height: 1, background: "var(--ink)" }} aria-hidden />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            Ref. {reference}
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(48px, 8vw, 88px)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
          }}
        >
          Thank you. A <em style={{ fontStyle: "italic" }}>Carbon specialist</em>
          <br />will follow up.
        </h1>

        <p
          style={{
            marginTop: 40,
            fontFamily: "var(--font-body)",
            fontSize: 18,
            lineHeight: 1.55,
            color: "var(--ink-2)",
            maxWidth: 560,
          }}
        >
          A specialist will review the submission, request anything missing (rent rolls, loss
          runs, current dec page), and come back with options across the carriers active on your
          asset class.
        </p>

        <div style={{ marginTop: 48, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-secondary">
            ← Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
