import { FadeUp } from "./motion-primitives";

export function Position() {
  return (
    <section
      id="position"
      aria-labelledby="position-headline"
      style={{
        background: "var(--ink)",
        color: "var(--paper)",
        borderTop: "1px solid var(--ink)",
        borderBottom: "1px solid var(--ink)",
        paddingBlock: "144px 112px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Atmospheric wash — a single off-axis pine vein */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 60% at 90% 30%, rgba(31,77,56,0.18) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative" }}>
        {/* Top index */}
        <FadeUp className="grid-12" as="div">
          <div className="col-7">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--ember)",
              }}
            >
              02 — Position
            </span>
          </div>
          <div className="col-5">
            <span
              style={{
                display: "block",
                textAlign: "right",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--paper-3)",
              }}
            >
              On focus &middot; A note from the agency
            </span>
          </div>
        </FadeUp>

        {/* Composition: 8-col manifesto / 1-col gutter / 3-col graphic block */}
        <div
          className="grid-12 position-body"
          style={{ marginTop: 80, alignItems: "stretch", position: "relative" }}
        >
          <FadeUp className="col-8" delay={0.05}>
            <h2
              id="position-headline"
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 400,
                fontSize: "clamp(36px, 5vw, 64px)",
                lineHeight: 1.04,
                letterSpacing: "-0.025em",
                color: "var(--paper)",
                textWrap: "balance",
                maxWidth: "18ch",
              }}
            >
              Specialty insurance.{" "}
              <em style={{ fontStyle: "italic", color: "var(--ember)" }}>
                Specialist underwriting.
              </em>
            </h2>

            <p
              className="drop-cap"
              style={{
                marginTop: 64,
                marginBottom: 24,
                fontFamily: "var(--font-body)",
                fontSize: 19,
                lineHeight: 1.65,
                color: "var(--paper-2)",
                maxWidth: 640,
                textWrap: "pretty",
              }}
            >
              Most brokerages sell breadth. Carbon sells depth. One asset class — real estate
              — across one geography — California and the eight Western states adjacent.
              Submissions read like the operator wrote them, because we read them line by line
              before we send them out.
            </p>

            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-body)",
                fontSize: 16,
                lineHeight: 1.65,
                color: "var(--paper-2)",
                maxWidth: 620,
                textWrap: "pretty",
              }}
            >
              The result is a shorter carrier list, a narrower set of exclusions to argue
              about, and a renewal cycle that respects the time of the person who owns the
              building.
            </p>
          </FadeUp>

          <FadeUp className="col-3 start-10 position-graphic" delay={0.18}>
            <aside
              style={{
                border: "1px solid var(--paper-3)",
                padding: "24px 24px",
                height: "100%",
                minHeight: 380,
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
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
                  color: "var(--ember)",
                }}
              >
                Chapter
              </span>
              <span
                aria-hidden
                style={{
                  alignSelf: "center",
                  justifySelf: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 400,
                  fontSize: "clamp(96px, 11vw, 160px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.04em",
                  color: "var(--paper)",
                  fontFeatureSettings: '"tnum" 1',
                }}
              >
                02
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  borderTop: "1px solid var(--paper-3)",
                  paddingTop: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--paper-2)",
                  }}
                >
                  One asset class
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--paper-2)",
                  }}
                >
                  Nine Western states
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--paper-2)",
                  }}
                >
                  One operational footprint
                </span>
              </div>
            </aside>
          </FadeUp>
        </div>

        {/* Bottom paginated rule */}
        <div
          style={{
            marginTop: 112,
            paddingTop: 24,
            borderTop: "1px solid var(--paper-3)",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "baseline",
            columnGap: 24,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--paper-3)",
            }}
          >
            Carbon Specialty Insurance
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.36em",
              textTransform: "uppercase",
              color: "var(--paper-3)",
              textAlign: "center",
            }}
          >
            · · ·
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--paper-2)",
              textAlign: "right",
            }}
          >
            02 / 06
          </span>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .position-body { row-gap: 48px; }
          .position-body .col-8,
          .position-body .col-3 { grid-column: 1 / -1 !important; }
          .position-graphic aside { min-height: 280px !important; }
        }
      `}</style>
    </section>
  );
}
