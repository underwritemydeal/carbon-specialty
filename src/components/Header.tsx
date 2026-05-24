"use client";

/**
 * Header — sprint C.S.2.0.
 *
 * 88px dark masthead. Logo lockup is Bodoni "CARBON" stacked over
 * IBM Plex Mono "SPECIALTY INSURANCE" micro-caps. Four nav links
 * (Coverage routes to /what-we-write since the standalone /coverage
 * route was killed in C.S.1.6.5). Right side is a single pine
 * "Get a quote" CTA — there is no login link.
 *
 * Scroll behavior: at scrollY > 8 a hairline paper-at-10% border
 * appears under the bar to separate it from content.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV = [
  { label: "Coverage", href: "/what-we-write" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Header({ activePath }: { activePath?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="cs-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: 88,
        background: "var(--ink)",
        borderBottom: scrolled
          ? "1px solid rgba(244,241,234,0.10)"
          : "1px solid transparent",
        transition: "border-color var(--dur-fast) var(--ease)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        className="container cs-header__inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
          width: "100%",
        }}
      >
        <Link href="/" className="cs-header__logo" aria-label="Carbon Specialty — home" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="cs-header__logo-name">CARBON</span>
          <span className="cs-header__logo-sub">SPECIALTY INSURANCE</span>
        </Link>

        <nav aria-label="Primary" className="cs-header__nav">
          {NAV.map(({ label, href }) => {
            const active = activePath === href;
            return (
              <Link
                key={href}
                href={href}
                className="cs-header__nav-link"
                data-active={active ? "true" : "false"}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="cs-header__actions">
          <Link href="/quote" className="cs-header__cta">Get a quote</Link>
        </div>
      </div>

      <style>{`
        .cs-header__logo {
          display: inline-flex;
          flex-direction: column;
          line-height: 1;
        }
        .cs-header__logo-name {
          font-family: var(--font-wordmark);
          font-size: 24px;
          letter-spacing: 0.18em;
          color: var(--paper);
        }
        .cs-header__logo-sub {
          margin-top: 6px;
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(244, 241, 234, 0.6);
        }
        .cs-header__nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .cs-header__nav-link {
          font-family: var(--font-body);
          font-size: 15px;
          color: rgba(244, 241, 234, 0.80);
          text-decoration: none;
          transition: color var(--dur-fast) var(--ease);
        }
        .cs-header__nav-link:hover,
        .cs-header__nav-link[data-active="true"] {
          color: var(--paper);
        }
        .cs-header__actions { display: flex; align-items: center; gap: 14px; }
        .cs-header__cta {
          display: inline-flex;
          align-items: center;
          padding: 13px 22px;
          background: var(--ember);
          color: var(--paper);
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          border: 1px solid var(--ember);
          border-radius: 8px;
          transition: background var(--dur-fast) var(--ease),
                      border-color var(--dur-fast) var(--ease);
        }
        .cs-header__cta:hover {
          background: var(--ember-ink);
          border-color: var(--ember-ink);
        }

        /* Mobile collapse — hide nav links + show only logo + CTA. */
        @media (max-width: 768px) {
          .cs-header__nav { display: none; }
        }
        @media (max-width: 480px) {
          .cs-header { height: 72px; }
          .cs-header__cta { padding: 10px 16px; font-size: 12px; }
          .cs-header__logo-name { font-size: 20px; }
          .cs-header__logo-sub { font-size: 8px; }
        }
      `}</style>
    </header>
  );
}
