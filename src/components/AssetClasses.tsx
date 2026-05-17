import Link from "next/link";
import { FadeUp } from "./motion-primitives";
import { ASSET_CLASSES } from "@/lib/asset-classes";

export { ASSET_CLASSES };

/**
 * Asset class grid — real editorial composition, not a uniform card strip.
 *
 * Layout:
 *   Row 1: feature card (cols 1–7) + supporting card (cols 8–12)
 *   Row 2: thin column (1–4) + thin column (5–8) + thin column (9–12)
 *   Row 3: wide card (cols 1–8) + graphic block (cols 9–12)
 * That's deliberately uneven — wide / narrow / narrow / narrow / wide / graphic.
 * The graphic block is a pine numeral on paper, taking the place of a photo
 * slot while photography is unavailable.
 */
const LAYOUT: Array<{ slug: typeof ASSET_CLASSES[number]["slug"]; col: string; height?: number; featured?: boolean }> = [
  { slug: "multifamily", col: "col-7 start-1", height: 420, featured: true },
  { slug: "mixed-use", col: "col-5 start-8", height: 420 },
  { slug: "sfr", col: "col-4 start-1", height: 280 },
  { slug: "hoa", col: "col-4 start-5", height: 280 },
  { slug: "small-commercial", col: "col-4 start-9", height: 280 },
  { slug: "builders-risk", col: "col-8 start-1", height: 360, featured: true },
];

export function AssetClassesGrid() {
  return (
    <section
      id="what-we-write"
      style={{
        background: "var(--paper)",
        borderBottom: "1px solid var(--ink)",
        paddingBlock: "128px 144px",
      }}
    >
      <div className="container">
        {/* Section masthead — eyebrow + display headline */}
        <FadeUp className="grid-12">
          <div className="col-12">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
              }}
            >
              03 — What we write
            </span>
          </div>
        </FadeUp>
        <FadeUp delay={0.05}>
          <h2
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 64px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              maxWidth: "20ch",
              textWrap: "balance",
            }}
          >
            Six asset classes.{" "}
            <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
              One short list of markets per class.
            </em>
          </h2>
        </FadeUp>

        <div className="rule" style={{ marginBlock: 80 }} />

        {/* Grid of asset class cards in deliberate uneven composition */}
        <div className="grid-12 ac-grid" style={{ rowGap: 32 }}>
          {LAYOUT.map((spot, i) => {
            const item = ASSET_CLASSES.find((a) => a.slug === spot.slug)!;
            const isWide = spot.featured;
            return (
              <FadeUp key={spot.slug} className={spot.col} delay={i * 0.04}>
                <article
                  id={spot.slug}
                  style={{
                    background: isWide ? "var(--ink)" : "var(--paper-2)",
                    color: isWide ? "var(--paper)" : "var(--ink)",
                    padding: isWide ? "40px 36px" : "28px 24px",
                    minHeight: spot.height,
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      borderBottom: `1px solid ${isWide ? "var(--paper-3)" : "var(--ink)"}`,
                      paddingBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: isWide ? 12 : 11,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: isWide ? "var(--ember-tint)" : "var(--ember)",
                      }}
                    >
                      {item.n} — Class
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: isWide ? "var(--paper-3)" : "var(--ink-3)",
                      }}
                    >
                      / 06
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontWeight: 400,
                      fontSize: isWide ? "clamp(40px, 4.5vw, 56px)" : "clamp(24px, 2.4vw, 32px)",
                      lineHeight: 1.0,
                      letterSpacing: "-0.025em",
                      color: isWide ? "var(--paper)" : "var(--ink)",
                      textWrap: "balance",
                    }}
                  >
                    {item.name}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-body)",
                      fontSize: isWide ? 17 : 14,
                      lineHeight: 1.6,
                      color: isWide ? "var(--paper-2)" : "var(--ink-2)",
                      textWrap: "pretty",
                      maxWidth: 480,
                    }}
                  >
                    {item.body}
                  </p>

                  <Link
                    href={`/what-we-write#${item.slug}`}
                    style={{
                      marginTop: "auto",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: isWide ? "var(--paper)" : "var(--ink)",
                      textDecoration: "none",
                      borderBottom: `1px solid ${isWide ? "var(--paper)" : "var(--ink)"}`,
                      paddingBottom: 2,
                      alignSelf: "flex-start",
                    }}
                  >
                    See coverage →
                  </Link>
                </article>
              </FadeUp>
            );
          })}

          {/* Graphic block — pine field with massive mono "06", takes the
              place of a photo slot. Anchors the bottom-right corner of the
              composition with a single color stamp. */}
          <FadeUp className="col-4 start-9" delay={0.32}>
            <div
              style={{
                background: "var(--ember)",
                color: "var(--paper)",
                minHeight: 360,
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                padding: "28px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--paper)",
                }}
              >
                In the field
              </span>
              <span
                aria-hidden
                style={{
                  alignSelf: "center",
                  justifySelf: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(140px, 18vw, 280px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.06em",
                  color: "var(--paper)",
                  fontFeatureSettings: '"tnum" 1',
                }}
              >
                06
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--ember-tint)",
                  textAlign: "right",
                }}
              >
                Classes written this issue
              </span>
            </div>
          </FadeUp>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .ac-grid > article { min-height: auto !important; }
        }
      `}</style>
    </section>
  );
}

export const AssetClasses = AssetClassesGrid;
