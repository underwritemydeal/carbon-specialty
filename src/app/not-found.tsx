import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
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
              color: "var(--ember)",
            }}
          >
            404
          </span>
          <h1
            style={{
              margin: "12px 0 24px",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(48px, 8vw, 88px)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
            }}
          >
            That page <em style={{ fontStyle: "italic" }}>isn&apos;t on the schedule</em>.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 18,
              lineHeight: 1.5,
              color: "var(--ink-2)",
              maxWidth: 560,
            }}
          >
            The page you&apos;re looking for either moved or was never written. The home page is one click away.
          </p>
          <div style={{ marginTop: 40, display: "flex", gap: 16 }}>
            <Link href="/" className="btn">Back to home</Link>
            <Link href="/contact" className="btn btn-secondary">Contact Carbon</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
