// ---------------------------------------------------------------------------
// Decorative line-art for the public (pure-black) marketing pages.
// Pure SVG so it renders instantly and works fully offline.
// ---------------------------------------------------------------------------

/** Classical institution / temple line-art (PUB-01 institutions block, PUB-04). */
export function TempleArt({
  width = 300,
  flag = true,
  stroke = "rgba(255,255,255,0.8)",
}: {
  width?: number;
  flag?: boolean;
  stroke?: string;
}) {
  const cols = [40, 78, 116, 154, 192, 230];
  return (
    <svg
      width={width}
      height={width * 0.72}
      viewBox="0 0 270 196"
      fill="none"
      stroke={stroke}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ maxWidth: "100%", display: "block" }}
    >
      {/* pediment */}
      <path d="M18 64 L135 18 L252 64 Z" />
      {/* architrave */}
      <line x1="30" y1="64" x2="240" y2="64" />
      <line x1="26" y1="76" x2="244" y2="76" />
      {/* columns */}
      {cols.map((x, i) => (
        <g key={i}>
          <line x1={x} y1="80" x2={x} y2="156" />
          <line x1={x + 14} y1="80" x2={x + 14} y2="156" />
          <line x1={x - 2} y1="80" x2={x + 16} y2="80" />
          <line x1={x - 3} y1="156" x2={x + 17} y2="156" />
        </g>
      ))}
      {/* steps */}
      <line x1="18" y1="166" x2="252" y2="166" />
      <line x1="10" y1="178" x2="260" y2="178" />
      {/* flag */}
      {flag && (
        <>
          <line x1="135" y1="18" x2="135" y2="2" />
          <path d="M135 4 L156 9 L135 14 Z" />
        </>
      )}
    </svg>
  );
}
