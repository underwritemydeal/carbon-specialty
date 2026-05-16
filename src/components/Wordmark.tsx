type Size = "sm" | "md" | "lg" | "xl";

export function Wordmark({ size = "md", inverted = false }: { size?: Size; inverted?: boolean }) {
  const cls = `wordmark ${size}${inverted ? " inverted" : ""}`;
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
