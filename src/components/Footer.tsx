import Link from "next/link";
import { Wordmark } from "./Wordmark";

const COLS: { head: string; items: { label: string; href: string }[] }[] = [
  {
    head: "What we write",
    items: [
      { label: "Multifamily", href: "/what-we-write#multifamily" },
      { label: "Mixed-use", href: "/what-we-write#mixed-use" },
      { label: "SFR portfolios", href: "/what-we-write#sfr" },
      { label: "Condo HOAs", href: "/what-we-write#hoa" },
      { label: "Builders risk", href: "/what-we-write#builders-risk" },
    ],
  },
  {
    head: "Service",
    items: [
      { label: "Get a quote", href: "/quote" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    head: "Agency",
    items: [
      { label: "About", href: "/about" },
      { label: "Insights", href: "/insights" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    head: "Contact",
    items: [
      { label: "Long Beach, California", href: "/contact" },
      { label: "Phone — launching soon", href: "/quote" },
      { label: "Email — launching soon", href: "/quote" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        padding: "96px var(--gutter) 32px",
      }}
    >
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(4, 1fr)",
            gap: 32,
            marginBottom: 80,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Wordmark size="md" inverted />
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 22,
                lineHeight: 1.3,
                color: "var(--paper-2)",
                maxWidth: 360,
              }}
            >
              California-based. Serving real estate and apartment building owners across the Western United States.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.head} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--paper-3)",
                }}
              >
                {c.head}
              </span>
              {c.items.map((i) => (
                <Link
                  key={i.label}
                  href={i.href}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    color: "var(--paper)",
                    textDecoration: "none",
                    lineHeight: 1.5,
                  }}
                >
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 28,
            borderTop: "1px solid var(--paper-3)",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--paper-3)",
            }}
          >
            © {new Date().getFullYear()} Carbon Specialty Insurance Services
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--paper-3)",
            }}
          >
            Licensed across AZ · CA · CO · ID · NV · OR · TX · UT · WA
          </span>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
