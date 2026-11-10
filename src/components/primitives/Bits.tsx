import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";

/** Compact progress indicator for buttons with an in-flight async action. */
export function InlineSpinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="pp-action-spinner"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/** Blue verified check used beside institution + user names. */
export function Verified({ size = 15 }: { size?: number }) {
  return <BadgeCheck size={size} className="pp-verified" strokeWidth={2.2} aria-label="Verified" />;
}

/** Green / red change indicator, e.g. "+16% vs last 30 days". */
export function Delta({
  value,
  suffix,
  positive = true,
  neutral = false,
}: {
  value: string;
  suffix?: string;
  positive?: boolean;
  neutral?: boolean;
}) {
  const color = neutral ? "var(--text-secondary)" : positive ? "var(--green)" : "var(--red)";
  return (
    <span style={{ fontSize: 12.5 }}>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
      {suffix && <span style={{ color: "var(--text-muted)" }}> {suffix}</span>}
    </span>
  );
}

/** Thin rounded progress / meter bar. */
export function ProgressBar({
  pct,
  color = "var(--blue)",
  track = "var(--surface-3)",
  height = 6,
}: {
  pct: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  return (
    <div style={{ background: track, borderRadius: 999, height, width: "100%", overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
        }}
      />
    </div>
  );
}

/** Tag chip shown under release headings. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="pp-tag">{children}</span>;
}

/** A small icon + value metric line (used in dashboards). */
export function MetaStat({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13 }}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
