import { Link } from "react-router-dom";

/**
 * The Presspaper wordmark. Rendered as clean type (as drawn in every screen)
 * with a small geometric glyph. `to` makes it a link; omit for a plain mark.
 */
export function Logo({
  size = 20,
  to,
  onLight = false,
}: {
  size?: number;
  to?: string;
  onLight?: boolean;
}) {
  const color = onLight ? "#0a0a0a" : "var(--text)";
  const inner = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "0",
          color,
        }}
      >
        Presspaper
      </span>
    </span>
  );

  if (to) {
    return (
      <Link to={to} aria-label="Presspaper home">
        {inner}
      </Link>
    );
  }
  return inner;
}
