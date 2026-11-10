import type { ReleaseStatus, MediaScene } from "@/types";
import { MediaTile } from "@/components/media/MediaTile";

const STATUS_STYLES: Record<ReleaseStatus, { color: string; bg: string }> = {
  Published: { color: "var(--green)", bg: "color-mix(in srgb, var(--green) 12%, transparent)" },
  Scheduled: { color: "var(--blue)", bg: "color-mix(in srgb, var(--blue) 12%, transparent)" },
  "Awaiting Review": { color: "var(--amber)", bg: "color-mix(in srgb, var(--amber) 12%, transparent)" },
  Draft: { color: "var(--text-secondary)", bg: "color-mix(in srgb, var(--text) 6%, transparent)" },
  Archived: { color: "var(--text-muted)", bg: "color-mix(in srgb, var(--text) 4%, transparent)" },
};

/** Coloured status pill (Published / Scheduled / Draft / Archived). */
export function StatusPill({ status }: { status: ReleaseStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        padding: "3px 9px",
        borderRadius: 999,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.color }} />
      {status}
    </span>
  );
}

/** Fixed-size media thumbnail used inside dashboard / table rows. */
export function MediaThumb({
  scene,
  w,
  h,
  radius = 8,
}: {
  scene: MediaScene;
  w: number;
  h: number;
  radius?: number;
}) {
  return (
    <div style={{ width: w, height: h, flexShrink: 0 }}>
      <MediaTile scene={scene} radius={radius} />
    </div>
  );
}
