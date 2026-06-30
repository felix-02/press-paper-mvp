import { supabase, isSupabaseConfigured, type ReleaseRow } from "@/lib/supabase";
import { rowToRelease } from "@/lib/releaseMap";
import { FEED_RELEASES, EXPLORE_RELEASES, SAVED_RELEASES, PROFILE_RELEASES } from "@/data/releases";
import type { Release } from "@/types";

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

/** Resolve a list of release ids (static demo ids or DB uuids) to Releases, preserving order. */
export async function resolveReleases(ids: string[]): Promise<Release[]> {
  const uuids = ids.filter((id) => UUID.test(id) && !STATIC_MAP.has(id));
  const map = new Map<string, Release>();
  STATIC.forEach((r) => {
    if (ids.includes(r.id)) map.set(r.id, r);
  });
  if (uuids.length && isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("releases").select("*").in("id", uuids);
    (data as ReleaseRow[] | null)?.forEach((row) => map.set(row.id, rowToRelease(row)));
  }
  return ids.map((id) => map.get(id)).filter((r): r is Release => !!r);
}
