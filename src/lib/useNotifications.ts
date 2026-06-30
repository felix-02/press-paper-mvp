import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured, type ReleaseRow } from "@/lib/supabase";
import { rowToRelease } from "@/lib/releaseMap";
import { useAppStore } from "@/store/useAppStore";
import { FEED_RELEASES, EXPLORE_RELEASES } from "@/data/releases";

export interface AppNotification {
  id: string;
  slug: string;
  heading: string;
  time: string;
  type: string;
  ts: number; // numeric timestamp for unread comparison
}

const STATIC = [...FEED_RELEASES, ...EXPLORE_RELEASES];
// Fixed base so static (demo) notifications keep a stable timestamp across
// renders — once marked seen they stay seen (no churn).
const STATIC_BASE = Date.parse("2024-05-12T09:00:00Z");

/** Recent releases from the institutions the user follows, with timestamps. */
export function useNotifications(): AppNotification[] {
  const followed = useAppStore((s) => s.followedSlugs);
  const slugs = [...followed];
  const [live, setLive] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || slugs.length === 0) {
      setLive([]);
      return;
    }
    let active = true;
    supabase
      .from("releases")
      .select("*")
      .eq("status", "Published")
      .in("institution_slug", slugs)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!active || !data) return;
        setLive(
          (data as ReleaseRow[]).map((row) => {
            const r = rowToRelease(row);
            return { id: r.id, slug: r.institutionSlug, heading: r.heading, time: r.time, type: r.type, ts: Date.parse(row.created_at ?? "") || 0 };
          })
        );
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(",")]);

  const staticOnes: AppNotification[] = STATIC.filter((r) => followed.has(r.institutionSlug)).map((r, i) => ({
    id: r.id,
    slug: r.institutionSlug,
    heading: r.heading,
    time: r.time,
    type: r.type,
    ts: STATIC_BASE - i * 3_600_000,
  }));

  const seen = new Set<string>();
  return [...live, ...staticOnes]
    .filter((n) => (!seen.has(n.id) ? (seen.add(n.id), true) : false))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8);
}
