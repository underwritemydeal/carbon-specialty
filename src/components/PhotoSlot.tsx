import Image from "next/image";

/**
 * PhotoSlot — editorial photograph or hairline TK placeholder.
 *
 * Per the design system rule: "If we don't have a photograph, leave the
 * slot empty with a 1px ink rule and a mono caption Photo: TK." This
 * component handles both states with the same API, so we can drop photos
 * into the existing layout once Higgsfield is unblocked.
 */
export function PhotoSlot({
  src,
  alt,
  caption,
  ratio = "21 / 9",
  inverted = false,
  priority = false,
  fill = false,
  silent = false,
}: {
  src?: string;
  alt: string;
  caption: string;
  ratio?: string;
  inverted?: boolean;
  priority?: boolean;
  fill?: boolean;
  /** Suppress the center "Photo · TK" label and border — for atmospheric
   *  background slots (the hero) where the placeholder shouldn't draw the
   *  eye away from the headline. The caption still renders quietly. */
  silent?: boolean;
}) {
  if (src) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      );
    }
    return (
      <div style={{ position: "relative", aspectRatio: ratio, width: "100%" }}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 1280px"
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }

  const fg = inverted ? "var(--paper-3)" : "var(--ink-3)";
  const rule = inverted ? "var(--paper-3)" : "var(--ink)";
  const bg = inverted ? "var(--ink)" : "var(--paper-2)";
  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        aspectRatio: fill ? undefined : ratio,
        width: "100%",
        height: fill ? "100%" : undefined,
        background: bg,
        border: silent ? "none" : `1px solid ${rule}`,
        display: "grid",
        placeItems: "center",
        position: "relative",
      }}
    >
      {!silent && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: fg,
          }}
        >
          Photo · TK
        </span>
      )}
      <span
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: fg,
          opacity: silent ? 0.5 : 1,
          maxWidth: "70%",
        }}
      >
        {caption}
      </span>
    </div>
  );
}
