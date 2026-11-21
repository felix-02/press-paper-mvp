import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveReleases } from "@/lib/releaseResolve";

interface ActivityEvent {
  id: string;
  event_type: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  release_id: string | null;
  watchlist_id: string | null;
  page_path: string | null;
  reaction: string | null;
}

export interface ActivityItem extends ActivityEvent {
  releaseHeading?: string;
}

const PAGE_SIZE = 30;

export function relativeTime(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  return `${Math.floor(mo / 12)} year${Math.floor(mo / 12) === 1 ? "" : "s"} ago`;
}

/** Timeline pages are ordered by timestamp and event ID, including ties. */
export function useActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cursor, setCursor] = useState<ActivityEvent | null>(null);
  const [next, setNext] = useState<ActivityEvent | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!supabase) {
          if (active) setError(true);
          return;
        }
        const { data, error: loadError } = await supabase.rpc("get_my_activity", {
          p_limit: PAGE_SIZE + 1,
          p_before_at: cursor?.created_at ?? null,
          p_before_id: cursor?.id ?? null,
        });
        if (!active) return;
        if (loadError || !data) {
          setError(true);
          return;
        }
        const rows = data as ActivityEvent[];
        const page = rows.slice(0, PAGE_SIZE);
        const ids = [...new Set(page.flatMap((row) => row.release_id ? [row.release_id] : []))];
        const releases = await resolveReleases(ids);
        if (!active) return;
        const headings = new Map(releases.map((release) => [release.id, release.heading]));
        const entries = page.map((row) => ({
          ...row,
          releaseHeading: row.release_id ? headings.get(row.release_id) : undefined,
        }));
        setItems((previous) => cursor ? [...previous, ...entries] : entries);
        setNext(rows.length > PAGE_SIZE ? page[page.length - 1] : null);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, cursor]);

  const loadMore = () => {
    if (loading || !next) return;
    setLoading(true);
    setCursor(next);
  };
  const retry = () => {
    if (loading) return;
    setError(false);
    setLoading(true);
    setAttempt((value) => value + 1);
  };
  return { items, loading, error, hasMore: next !== null, loadMore, retry };
}
