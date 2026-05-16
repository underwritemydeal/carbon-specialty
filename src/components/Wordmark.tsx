type Size = "sm" | "md" | "lg" | "xl";
type Align = "center" | "left";

export function Wordmark({
  size = "md",
  inverted = false,
  align = "center",
}: {
  size?: Size;
  inverted?: boolean;
  align?: Align;
}) {
  const cls = `wordmark ${size}${inverted ? " inverted" : ""} align-${align}`;
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
