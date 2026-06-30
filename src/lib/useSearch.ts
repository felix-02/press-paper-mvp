import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured, type ReleaseRow } from "@/lib/supabase";
import { rowToRelease } from "@/lib/releaseMap";
import { DIRECTORY_SLUGS, INSTITUTIONS, inst } from "@/data/institutions";
import { FEED_RELEASES, EXPLORE_RELEASES, SAVED_RELEASES, PROFILE_RELEASES } from "@/data/releases";
import type { Release, Institution } from "@/types";

function dedupe(list: Release[]): Release[] {
  const seen = new Set<string>();
  const out: Release[] = [];
  for (const r of list) if (!seen.has(r.id)) (seen.add(r.id), out.push(r));
  return out;
}

const STATIC_RELEASES = dedupe([...FEED_RELEASES, ...EXPLORE_RELEASES, ...SAVED_RELEASES, ...PROFILE_RELEASES]);
const ALL_INSTITUTIONS: Institution[] = Array.from(
  new Map(
    [...DIRECTORY_SLUGS.map((s) => inst(s)), ...Object.values(INSTITUTIONS)].map((i) => [i.slug, i])
  ).values()
);

export interface SearchResults {
  releases: Release[];
  institutions: Institution[];
  empty: boolean;
}

/** Global search over institutions + static and live (DB) releases. */
export function useSearch(query: string): SearchResults {
  const q = query.trim().toLowerCase();
  const [live, setLive] = useState<Release[]>([]);

  useEffect(() => {
    if (!q || !isSupabaseConfigured || !supabase) {
      setLive([]);
      return;
    }
    let active = true;
    supabase
      .from("releases")
      .select("*")
      .eq("status", "Published")
      .ilike("heading", `%${q}%`)
      .limit(25)
      .then(({ data }) => {
        if (active && data) setLive((data as ReleaseRow[]).map(rowToRelease));
      });
    return () => {
      active = false;
    };
  }, [q]);

  return useMemo(() => {
    if (!q) return { releases: [], institutions: [], empty: true };
    const staticMatches = STATIC_RELEASES.filter(
      (r) =>
        r.heading.toLowerCase().includes(q) ||
        r.subheading.toLowerCase().includes(q) ||
        inst(r.institutionSlug).name.toLowerCase().includes(q)
    );
    const releases = dedupe([...live, ...staticMatches]).slice(0, 30);
    const institutions = ALL_INSTITUTIONS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || (i.subName ?? "").toLowerCase().includes(q)
    ).slice(0, 10);
    return { releases, institutions, empty: releases.length === 0 && institutions.length === 0 };
  }, [q, live]);
}
