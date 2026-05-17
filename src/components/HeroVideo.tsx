"use client";

import { useEffect, useRef } from "react";

/**
 * HeroVideo — contained image plate that sits below the headline lockup.
 *
 * - <video autoplay muted loop playsInline preload="metadata" aria-hidden>
 *   with WebM + MP4 sources and a poster JPG. Decorative, no audio, never
 *   blocks paint.
 * - The CSS `.no-motion` block (driven by `prefers-reduced-motion: reduce`)
 *   hides the <video> and shows the poster <img> in its place.
 * - Parallax: scroll-driven translateY at 0.5× scroll, capped at 40px.
 *   Implemented with a single rAF loop and a passive scroll listener.
 *   Bails when reduced motion is requested.
 */
export function HeroVideo({ caption }: { caption: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      // Distance the wrap's top has scrolled past the viewport top.
      // Negative when the wrap is below the fold.
      const scrollPast = -rect.top;
      // Half-rate parallax, capped at ±40px so we never overshoot.
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

  return (
    <div className="hero-video-wrap">
      {/* Hairline ink rule above the plate */}
      <div aria-hidden style={{ height: 1, background: "var(--ink)", marginBottom: 12 }} />

      <div ref={wrapRef} className="hero-video-plate">
        <video
          ref={videoRef}
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

      <span className="hero-video-caption">{caption}</span>

      <style>{`
        .hero-video-plate {
          position: relative;
          width: 100%;
          height: 50vh;
          min-height: 320px;
          max-height: 640px;
          overflow: hidden;
          background: var(--paper-2);
          transform: translate3d(0, var(--hero-parallax, 0px), 0);
          will-change: transform;
        }
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
        .hero-video-caption {
          display: block;
          margin-top: 10px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink-3);
        }
        @media (max-width: 1024px) {
          .hero-video-plate { height: 40vh; min-height: 280px; }
        }
        @media (max-width: 600px) {
          .hero-video-plate { height: 30vh; min-height: 200px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-video        { display: none; }
          .hero-video-poster { display: block; }
          .hero-video-plate  { transform: none !important; }
        }
      `}</style>
    </div>
  );
}
