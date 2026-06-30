import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured, type ReleaseRow } from "@/lib/supabase";
import { rowToRelease } from "@/lib/releaseMap";
import { useAppStore } from "@/store/useAppStore";
import { FEED_RELEASES, EXPLORE_RELEASES, SAVED_RELEASES, PROFILE_RELEASES } from "@/data/releases";
import type { Release } from "@/types";

// All static demo releases an individual could save, de-duped.
const STATIC: Release[] = (() => {
  const seen = new Set<string>();
  const out: Release[] = [];
  for (const r of [...SAVED_RELEASES, ...FEED_RELEASES, ...EXPLORE_RELEASES, ...PROFILE_RELEASES]) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
})();
const STATIC_MAP = new Map(STATIC.map((r) => [r.id, r]));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the current saved-id set into full Release objects. Static demo
 * releases resolve instantly; real (DB) releases are fetched once and cached.
 */
export function useResolvedSaved(): { releases: Release[]; loading: boolean } {
  const savedIds = useAppStore((s) => s.savedIds);
  const [dbMap, setDbMap] = useState<Map<string, Release>>(new Map());
  const [loading, setLoading] = useState(false);

  const missing = useMemo(
    () => [...savedIds].filter((id) => !STATIC_MAP.has(id) && !dbMap.has(id) && UUID.test(id)),
    [savedIds, dbMap]
  );
  const missingKey = missing.join(",");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || missing.length === 0) return;
    let active = true;
    setLoading(true);
    supabase
      .from("releases")
      .select("*")
      .in("id", missing)
      .then(({ data }) => {
        if (!active) return;
        setLoading(false);
        if (data) {
          setDbMap((prev) => {
            const m = new Map(prev);
            (data as ReleaseRow[]).forEach((r) => m.set(r.id, rowToRelease(r)));
            return m;
          });
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  const releases = useMemo(() => {
    const out: Release[] = [];
    for (const id of savedIds) {
      const r = STATIC_MAP.get(id) ?? dbMap.get(id);
      if (r) out.push(r);
    }
    return out;
  }, [savedIds, dbMap]);

  return { releases, loading };
}
