import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { PhotoSlot } from "./PhotoSlot";

const COLOPHON = {
  brand:
    "California-based real estate specialty. Selective placements available nationally through wholesale and program partners.",
  services: [
    { label: "What we write", href: "/what-we-write" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Get a quote", href: "/quote" },
  ],
  agency: [
    { label: "About", href: "/about" },
    { label: "Insights", href: "/insights" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top photographic band — Slot 5 placeholder */}
      <div
        aria-hidden
        style={{
          position: "relative",
          height: "40vh",
          minHeight: 280,
          borderBottom: "1px solid var(--paper-3)",
          overflow: "hidden",
        }}
      >
        <PhotoSlot
          alt="Wide-angle California urban skyline at dusk, mid-rise apartment buildings and palm trees silhouetted against the sky."
          caption="Dusk · Western Skyline · 05"
          inverted
          fill
        />
      </div>

      {/* Colophon */}
      <div
        className="container"
        style={{
          paddingBlock: "96px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 64,
        }}
      >
        {/* Wordmark + brand statement */}
        <div
          className="grid-12 footer-top"
          style={{ alignItems: "flex-start", rowGap: 32 }}
        >
          <div className="col-5">
            <Wordmark size="md" inverted />
          </div>
          <p
            className="col-6 start-7"
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(20px, 2.2vw, 28px)",
              lineHeight: 1.3,
              color: "var(--paper-2)",
              textWrap: "balance",
            }}
          >
            {COLOPHON.brand}
          </p>
        </div>

        <div className="rule" style={{ background: "var(--paper-3)" }} />

        {/* Three columns + licensed footer */}
        <div className="grid-12 footer-cols" style={{ rowGap: 32, alignItems: "flex-start" }}>
          <FooterCol head="Services" items={COLOPHON.services} className="col-4" />
          <FooterCol head="Agency" items={COLOPHON.agency} className="col-4" />
          <FooterCol head="Legal" items={COLOPHON.legal} className="col-4" />
        </div>

        <div className="rule" style={{ background: "var(--paper-3)" }} />

        {/* Print credit + page number */}
        <div
          className="grid-12 footer-credit"
          style={{ alignItems: "baseline", rowGap: 16 }}
        >
          <span
            className="col-8"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--paper-3)",
            }}
          >
            © {new Date().getFullYear()} Carbon Specialty Insurance Services. Set in Bodoni
            Moda and IBM Plex. Built {new Date().getFullYear()} by the agency.
          </span>
          <span
            className="col-4"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--paper-2)",
              textAlign: "right",
            }}
          >
            06 / 06 · End
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-top .col-5,
          .footer-top .col-6 { grid-column: 1 / -1 !important; }
          .footer-cols .col-2,
          .footer-cols .col-3,
          .footer-cols .col-4 { grid-column: 1 / -1 !important; }
          .footer-credit .col-4,
          .footer-credit .col-8 { grid-column: 1 / -1 !important; text-align: left !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({
  head,
  items,
  className,
}: {
  head: string;
  items: { label: string; href: string }[];
  className: string;
}) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--paper-3)",
        }}
      >
        {head}
      </span>
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "var(--paper)",
            textDecoration: "none",
            lineHeight: 1.4,
            borderBottom: "1px solid transparent",
            transition: "border-color var(--dur-fast) var(--ease)",
            alignSelf: "flex-start",
          }}
          className="footer-link"
        >
          {i.label}
        </Link>
      ))}
      <style>{`
        .footer-link:hover { border-bottom-color: var(--ember); }
      `}</style>
    </div>
  );
}
