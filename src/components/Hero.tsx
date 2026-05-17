"use client";

/**
 * Hero — sprint C.S.1.5.
 *
 * Full-bleed video block. The video fills the section; masthead / eyebrow
 * / headline are absolutely positioned over it. Two pure ink-to-transparent
 * gradient overlays provide legibility at the top (for masthead) and the
 * bottom (for headline + the sharp transition into the paper section below).
 *
 * Lede + chat moved to <HeroLede /> in a separate paper-base section.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Wordmark } from "./Wordmark";

const EASE = [0.2, 0.7, 0.2, 1] as const;

const HEADLINE_LINE_1 = "Insuring the buildings that make our cities";
const HEADLINE_LINE_2 = "home.";

export function Hero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Half-rate scroll parallax on the video, capped ±40px. Same logic as
  // the old HeroVideo component — reduced-motion bails out cleanly.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceQuery.matches) return;

    let raf = 0;
    let pending = false;
    const update = () => {
      pending = false;
      const rect = wrap.getBoundingClientRect();
      const scrollPast = -rect.top;
      let offset = scrollPast * 0.5;
      if (offset > 40) offset = 40;
      if (offset < -40) offset = -40;
      wrap.style.setProperty("--hero-parallax", `${offset}px`);
    };
    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const headlineWords = HEADLINE_LINE_1.split(" ");

  return (
    <section
      aria-labelledby="hero-headline"
      className="hero-fullbleed"
      style={{
        position: "relative",
        background: "var(--ink)",
        color: "var(--paper)",
        overflow: "hidden",
        borderBottom: "1px solid var(--ink)",
      }}
    >
      {/* === Full-bleed video layer === */}
      <div
        ref={wrapRef}
        className="hero-video-wrap"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          transform: "translate3d(0, var(--hero-parallax, 0px), 0)",
          willChange: "transform",
        }}
      >
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/hero-painted-ladies-poster.jpg"
          aria-hidden="true"
        >
          <source src="/videos/hero-painted-ladies.webm" type="video/webm" />
          <source src="/videos/hero-painted-ladies.mp4" type="video/mp4" />
        </video>
        <img
          src="/videos/hero-painted-ladies-poster.jpg"
          alt=""
          aria-hidden="true"
          className="hero-video-poster"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* === Top gradient overlay — masthead legibility === */}
      <div
        aria-hidden
        className="hero-overlay hero-overlay--top"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(to bottom, rgba(11,11,12,0.7) 0%, rgba(11,11,12,0) 30%)",
          pointerEvents: "none",
        }}
      />

      {/* === Bottom gradient overlay — headline legibility + ink→paper transition === */}
      <div
        aria-hidden
        className="hero-overlay hero-overlay--bottom"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(to top, rgba(11,11,12,0.7) 0%, rgba(11,11,12,0) 35%)",
          pointerEvents: "none",
        }}
      />

      {/* === Content layer === */}
      <div
        className="container hero-content"
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* MASTHEAD */}
        <header
          className="hero-masthead"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 32,
          }}
        >
          <Link
            href="/"
            style={{ textDecoration: "none", color: "inherit" }}
            aria-label="Carbon Specialty — home"
          >
            <Wordmark size="sm" overVideo align="left" />
          </Link>

          <nav aria-label="Primary" className="hero-nav" style={{ display: "flex", justifyContent: "center", gap: 32 }}>
            {[
              { label: "What we write", href: "/what-we-write" },
              { label: "How it works", href: "/how-it-works" },
              { label: "About", href: "/about" },
              { label: "Insights", href: "/insights" },
              { label: "Contact", href: "/contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="nav-link nav-link--paper">
                <span>{l.label}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger — only renders ≤960px (nav hidden). Routes
              users to /contact as the simplest mobile menu fallback. */}
          <Link
            href="/contact"
            aria-label="Open menu"
            className="hero-hamburger"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              border: "1px solid var(--paper)",
              color: "var(--paper)",
              textDecoration: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="7"  x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </Link>

          <Link
            href="/quote"
            className="hero-quote-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              border: "1px solid var(--paper)",
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              textDecoration: "none",
              transition: "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
            }}
          >
            Get a quote
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          </Link>
        </header>

        {/* EYEBROW ROW — paper text on video, hairline rule below at 30% */}
        <div
          className="hero-eyebrow grid-12"
          style={{
            alignItems: "baseline",
            paddingTop: 20,
            marginTop: 16,
            borderTop: "1px solid rgba(245,242,236,0.3)",
          }}
        >
          <span
            className="col-6 hero-eyebrow-left"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--paper)",
            }}
          >
            00 — Get a quote
          </span>
          <span
            className="col-6 hero-eyebrow-right"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "flex-end",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--paper)",
            }}
          >
            <PulseDot />
            <span>Carbon · online · responding in seconds</span>
          </span>
        </div>

        {/* Spacer pushes the headline to the bottom third of the hero */}
        <div style={{ flex: 1 }} />

        {/* HEADLINE — anchored bottom-third, left-aligned with masthead */}
        <motion.h1
          id="hero-headline"
          className="hero-h1"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
          }}
          style={{
            margin: 0,
            paddingBottom: 64,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "clamp(56px, 8.5vw, 120px)",
            lineHeight: 1.04,
            letterSpacing: "-0.025em",
            color: "var(--paper)",
            maxWidth: "14ch",
            textWrap: "balance",
          }}
        >
          {headlineWords.map((w, i) => (
            <Word key={i} reduce={reduce}>{w}</Word>
          ))}
          <br />
          <span style={{ display: "inline-block", marginTop: "0.2em" }}>
            <Accent reduce={reduce} stagger={headlineWords.length}>{HEADLINE_LINE_2}</Accent>
          </span>
        </motion.h1>
      </div>

      <style>{`
        /* Heights */
        .hero-fullbleed { height: 85vh; min-height: 640px; }
        @media (max-width: 1024px) { .hero-fullbleed { height: 75vh; min-height: 560px; } }
        @media (max-width: 600px)  { .hero-fullbleed { height: 60vh; min-height: 460px; } }

        /* Content layout */
        .hero-content { padding-top: 40px; padding-bottom: 0; }
        @media (max-width: 1024px) { .hero-content { padding-top: 24px; } }
        @media (max-width: 600px)  { .hero-content { padding-top: 16px; } }

        /* Video + poster */
        .hero-video,
        .hero-video-poster {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hero-video-poster { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .hero-video        { display: none; }
          .hero-video-poster { display: block; }
          .hero-video-wrap   { transform: none !important; }
        }

        /* Nav link, paper variant — overrides the default --ink underline */
        .nav-link--paper { color: var(--paper); }
        .nav-link--paper::after { background: var(--paper); }
        .nav-link--paper:hover { color: var(--paper); }

        /* Quote button hover — invert (paper bg, ink text) on hover so it
           reads as the inverse of its rest state. Border stays paper. */
        .hero-quote-btn:hover { background: var(--paper) !important; color: var(--ink) !important; }

        /* Bottom gradient grows on mobile to give the smaller headline more
           legibility room (per spec — ~45% of hero on mobile). */
        @media (max-width: 600px) {
          .hero-overlay--bottom {
            background: linear-gradient(to top, rgba(11,11,12,0.7) 0%, rgba(11,11,12,0) 45%) !important;
          }
        }

        /* Mobile nav: collapse, show hamburger */
        @media (max-width: 960px) {
          .hero-nav        { display: none !important; }
          .hero-hamburger  { display: inline-flex !important; }
          .hero-quote-btn  { display: none !important; }
        }

        /* Eyebrow row stacks vertically on mobile */
        @media (max-width: 600px) {
          .hero-eyebrow .hero-eyebrow-left,
          .hero-eyebrow .hero-eyebrow-right { grid-column: 1 / -1 !important; justify-content: flex-start !important; }
          .hero-eyebrow .hero-eyebrow-right { margin-top: 6px; }
        }
      `}</style>
    </section>
  );
}

function Word({ children, reduce }: { children: React.ReactNode; reduce: boolean | null }) {
  return (
    <motion.span
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
      style={{ display: "inline-block", whiteSpace: "pre", marginRight: "0.22em" }}
    >
      {children}
    </motion.span>
  );
}

function Accent({
  children,
  reduce,
  stagger = 0,
}: {
  children: React.ReactNode;
  reduce: boolean | null;
  stagger?: number;
}) {
  return (
    <motion.em
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.85, ease: EASE, delay: stagger * 0.05 + 0.2 },
        },
      }}
      style={{
        display: "inline-block",
        fontFamily: "var(--font-wordmark)",
        fontStyle: "italic",
        fontWeight: 400,
        color: "var(--ember)",
        paddingRight: "0.06em",
      }}
    >
      {children}
    </motion.em>
  );
}

function PulseDot() {
  return (
    <span aria-hidden className="hero-pulse-dot">
      <style>{`
        .hero-pulse-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--ember);
          animation: hero-pulse-dot-anim 2s ease-in-out infinite;
        }
        @keyframes hero-pulse-dot-anim {
          0%   { opacity: 1; }
          50%  { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-pulse-dot { animation: none; opacity: 1; }
        }
      `}</style>
    </span>
  );
}
