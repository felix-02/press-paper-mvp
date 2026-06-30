import { seededSeries } from "@/data/analytics";

// Weekly activity heatmap — columns are days, rows are time bands. Intensities
// are deterministic (seeded) so the demo renders identically every time.

export function Heatmap({
  cols = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  rows = ["12 AM", "6 AM", "12 PM", "6 PM"],
  cell = 13,
  gap = 4,
  base = "#3b82f6",
}: {
  cols?: string[];
  rows?: string[];
  cell?: number;
  gap?: number;
  base?: string;
}) {
  // Build an intensity grid [row][col] in 0..1, weighted to office hours/weekdays.
  const grid: number[][] = rows.map((_, r) => {
    const series = seededSeries(r * 7 + 3, cols.length, {
      base: 0.5,
      amp: 0.28,
      noise: 0.25,
    });
    return cols.map((_, c) => {
      const dayWeight = c < 5 ? 1 : 0.55; // weekdays busier
      const timeWeight = r === 1 || r === 2 ? 1 : r === 3 ? 0.8 : 0.4; // daytime busier
      const v = (series[c] / 1) * dayWeight * timeWeight;
      return Math.max(0.06, Math.min(1, v));
    });
  });

  const labelW = 42;

  return (
    <div style={{ display: "inline-block" }}>
      <div style={{ display: "flex" }}>
        <div style={{ width: labelW }} />
        <div style={{ display: "flex", gap }}>
          {cols.map((c) => (
            <div
              key={c}
              style={{
                width: cell,
                textAlign: "center",
                fontSize: 9.5,
                color: "var(--text-faint)",
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
      {rows.map((rowLabel, r) => (
        <div key={rowLabel} style={{ display: "flex", alignItems: "center", marginTop: gap }}>
          <div style={{ width: labelW, fontSize: 9.5, color: "var(--text-faint)" }}>
            {rowLabel}
          </div>
          <div style={{ display: "flex", gap }}>
            {grid[r].map((v, c) => (
              <div
                key={c}
                title={`${cols[c]} · ${rowLabel}`}
                style={{
                  width: cell,
                  height: cell,
                  borderRadius: 3,
                  background: base,
                  opacity: 0.12 + v * 0.85,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
