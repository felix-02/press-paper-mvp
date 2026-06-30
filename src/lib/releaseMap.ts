import type { ReleaseRow } from "@/lib/supabase";
import type { Release, MediaScene, ReleaseType, ReleaseStatus } from "@/types";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 45) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Compact number label, e.g. 1234 → "1.2K". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Convert a `public.releases` row into the in-app Release shape used by cards/tables. */
export function rowToRelease(row: ReleaseRow): Release {
  const stamp = row.published_at ?? row.created_at;
  const fresh = Date.now() - new Date(row.created_at).getTime() < 5 * 60 * 1000;
  return {
    id: row.id,
    institutionSlug: row.institution_slug,
    type: row.type as ReleaseType,
    status: row.status as ReleaseStatus,
    heading: row.heading,
    subheading: row.subheading ?? "",
    time: relativeTime(stamp),
    publishedDate: row.status === "Published" ? dateLabel(stamp) : row.status,
    publishedTime: timeLabel(row.published_at),
    scene: row.scene as MediaScene,
    tags: [],
    views: formatCount(row.views ?? 0),
    comments: formatCount(row.comments_count ?? 0),
    engagement: formatCount((row.views ?? 0) + (row.comments_count ?? 0)),
    body: row.body ?? null,
    isNew: fresh,
  };
}
