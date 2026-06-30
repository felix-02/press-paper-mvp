import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Real engagement for a single release, keyed by its (text) id so it works for
 * both DB releases and static demo releases:
 *  - views: a real counter incremented once per page view
 *  - comments: the real number of comments stored for this release
 * Falls back to the provided seed numbers when the backend isn't configured.
 */
export function useReleaseEngagement(releaseId: string, seedViews: number, seedComments: number) {
  const [views, setViews] = useState<number | null>(null);
  const [comments, setComments] = useState<number | null>(null);
  const available = isSupabaseConfigured && !!supabase;

  useEffect(() => {
    if (!available || !supabase) return;
    let active = true;

    // Count real comments for this release.
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("release_id", releaseId)
      .then(({ count }) => {
        if (active && typeof count === "number") setComments(count);
      });

    // Register this view and read back the real total.
    supabase.rpc("bump_release_view", { rid: releaseId }).then(({ data, error }) => {
      if (!active) return;
      if (!error && typeof data === "number") {
        setViews(data);
      } else {
        // Fall back to reading the current total if the bump RPC isn't deployed.
        supabase!
          .from("release_engagement")
          .select("views")
          .eq("release_id", releaseId)
          .maybeSingle()
          .then(({ data: row }) => {
            if (active && row) setViews((row as { views: number }).views);
          });
      }
    });

    return () => {
      active = false;
    };
  }, [releaseId, available]);

  return {
    views: views ?? seedViews,
    comments: comments ?? seedComments,
    isLiveViews: views !== null,
    isLiveComments: comments !== null,
  };
}
