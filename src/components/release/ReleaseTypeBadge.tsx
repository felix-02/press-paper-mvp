import type { StandardReleaseType } from "@/types";

const TYPE_COLORS: Record<StandardReleaseType, string> = {
  Announcement: "var(--type-announcement)",
  Consultation: "var(--type-consultation)",
  Publication: "var(--type-publication)",
  "Statistics & Research": "var(--type-statistics)",
  Report: "var(--type-report)",
  "Press Release": "var(--type-press)",
  Legislation: "var(--type-legislation)",
};

export function typeColor(type: string): string {
  return Object.prototype.hasOwnProperty.call(TYPE_COLORS, type) ? TYPE_COLORS[type as StandardReleaseType] : "var(--text-secondary)";
}

/** Small coloured release-type pill. `solid` gives the filled-bg variant used on cards. */
export function TypeBadge({
  type,
  size = "md",
}: {
  type: string;
  size?: "sm" | "md";
}) {
  const color = typeColor(type);
  return (
    <span
      className="pp-badge"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        fontSize: size === "sm" ? "11px" : "11.5px",
        padding: size === "sm" ? "2px 8px" : "3px 9px",
      }}
    >
      {type}
    </span>
  );
}
