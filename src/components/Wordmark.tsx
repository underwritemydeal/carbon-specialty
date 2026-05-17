type Size = "sm" | "md" | "lg" | "xl";
type Align = "center" | "left";

/**
 * Wordmark
 *
 * `inverted` — everything (including CA) renders in paper for ink grounds.
 * `overVideo` — masthead-on-video variant added in C.S.1.5: CA stays --pine
 *   as the brand stamp, RBON and the hairline rule and the sub-line shift
 *   to --paper. Use this when laying the wordmark over a hero video where
 *   only one accent should compete with the moving image.
 *
 * `overVideo` wins when both are passed.
 */
export function Wordmark({
  size = "md",
  inverted = false,
  overVideo = false,
  align = "center",
}: {
  size?: Size;
  inverted?: boolean;
  overVideo?: boolean;
  align?: Align;
}) {
  const variant = overVideo ? " over-video" : inverted ? " inverted" : "";
  const cls = `wordmark ${size}${variant} align-${align}`;
  return (
    <div className={cls} aria-label="Carbon Specialty">
      <div className="wm-name" aria-hidden>
        <span className="wm-ca">CA</span>RBON
      </div>
      <div className="wm-rule" aria-hidden />
      <div className="wm-sub" aria-hidden>Specialty &middot; Insurance</div>
    </div>
  );
}
