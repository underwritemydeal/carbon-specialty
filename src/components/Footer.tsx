/**
 * Footer — sprint C.S.2.0.
 *
 * Single-row dark footer. Left holds the Bodoni wordmark lockup +
 * copyright + license note. Right holds the same four nav items as
 * the header so users have a tail-end exit at the bottom of the
 * page. Replaces the earlier multi-column colophon — that pattern
 * pre-dated the C.S.2.0 redesign and read as marketing chrome the
 * editorial dark surface didn't need.
 */

import Link from "next/link";
import { Wordmark } from "./Wordmark";

const NAV = [
  { label: "Coverage", href: "/what-we-write" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="cs-footer">
      <div className="container cs-footer__inner">
        <div className="cs-footer__left">
          <Link href="/" className="cs-footer__logo" aria-label="Carbon Specialty — home">
            {/* C.S.2.0.1 — canonical Wordmark restored. Inverted
                variant: paper CARBON, paper rule, paper sub. The
                pine CA color is suppressed in inverted mode so the
                whole lockup reads as a single light unit on dark. */}
            <Wordmark size="sm" inverted align="left" />
          </Link>
          <span className="cs-footer__credit">
            © {year} Carbon Specialty. Licensed insurance brokerage.
          </span>
        </div>
        <nav aria-label="Footer" className="cs-footer__nav">
          {NAV.map(({ label, href }) => (
            <Link key={href} href={href} className="cs-footer__link">
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <style>{`
        .cs-footer {
          background: var(--ink);
          color: var(--paper);
          border-top: 1px solid rgba(244,241,234,0.10);
          padding: 40px 0;
        }
        .cs-footer__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          flex-wrap: wrap;
        }
        .cs-footer__left {
          display: flex;
          align-items: center;
          gap: 32px;
          flex-wrap: wrap;
        }
        .cs-footer__logo {
          display: inline-flex;
          line-height: 1;
          text-decoration: none;
          color: inherit;
        }
        .cs-footer__credit {
          font-family: var(--font-body);
          font-size: 13px;
          color: rgba(244,241,234,0.40);
        }
        .cs-footer__nav {
          display: inline-flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .cs-footer__link {
          font-family: var(--font-body);
          font-size: 13px;
          color: rgba(244,241,234,0.40);
          text-decoration: none;
          transition: color var(--dur-fast) var(--ease);
        }
        .cs-footer__link:hover { color: var(--paper); }

        @media (max-width: 600px) {
          .cs-footer { padding: 32px 0; }
          .cs-footer__inner { flex-direction: column; align-items: flex-start; gap: 24px; }
          .cs-footer__left { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
      `}</style>
    </footer>
  );
}
