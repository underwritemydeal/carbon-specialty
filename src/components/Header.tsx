import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { Icon } from "./Icon";

// C.S.1.6.5 — `Coverage` removed (the /coverage route was killed in
// this sprint along with the home Coverage section; the editorial
// reference page didn't carry its weight). Order reads: What we write
// → How it works → About → Insights → Contact across desktop nav,
// hero masthead nav, and footer services.
const NAV = [
  { label: "What we write", href: "/what-we-write" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" },
];

export function Header({ activePath }: { activePath?: string }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--paper)",
        borderBottom: "1px solid var(--ink)",
        padding: "20px var(--gutter)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <Link href="/" style={{ textDecoration: "none" }} aria-label="Carbon Specialty — home">
        <Wordmark size="sm" />
      </Link>
      <nav aria-label="Primary" className="nav-primary">
        {NAV.map(({ label, href }) => {
          const active = activePath === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "var(--ink)",
                textDecoration: "none",
                borderBottom: active ? "1px solid var(--ember)" : "1px solid transparent",
                paddingBottom: 2,
                transition: "border-color var(--dur-fast) var(--ease)",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="header-actions">
        <span
          className="nav-phone"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          Phone — launching soon
        </span>
        <Link href="/quote" className="btn" style={{ padding: "12px 18px", fontSize: 13 }}>
          Get a quote
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>
      <style>{`
        .nav-primary { display: flex; gap: 28px; align-items: center; }
        .header-actions { display: flex; gap: 14px; align-items: center; }
        @media (max-width: 900px) {
          .nav-primary { display: none; }
          .nav-phone { display: none; }
        }
      `}</style>
    </header>
  );
}
