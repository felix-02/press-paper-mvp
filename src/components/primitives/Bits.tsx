import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/cn";

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
  track = "rgba(255,255,255,0.08)",
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

/** A muted "View all →" / "View full →" link (inert by default in the demo). */
export function SectionLink({
  children = "View all",
  onClick,
}: {
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="pp-link-muted" onClick={onClick} type="button">
      {children}
      <ArrowRight size={14} />
    </button>
  );
}

/**
 * Visible-but-inert control. The SoW requires every non-wired control to be
 * present and to *never* error or dead-end. This wraps such controls so a click
 * is a guaranteed no-op (it just stops propagation).
 */
export function Inert({
  children,
  className,
  title,
  as = "button",
  style,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  as?: "button" | "div" | "span";
  style?: React.CSSProperties;
}) {
  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  if (as === "button") {
    return (
      <button type="button" className={className} title={title} onClick={handle} style={style}>
        {children}
      </button>
    );
  }
  const Tag = as;
  return (
    <Tag className={cn(className)} title={title} onClick={handle} style={style}>
      {children}
    </Tag>
  );
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
