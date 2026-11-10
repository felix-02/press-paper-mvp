import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase, type ReleaseRow } from "@/lib/supabase";
import { rowToRelease } from "@/lib/releaseMap";
import type { Release } from "@/types";

const INITIAL_POLL_DELAY_MS = 1_000;
const POLL_INTERVAL_MS = 60_000;
let channelSequence = 0;

function releaseTimestamp(release: Release): number {
  return release.createdAt ?? 0;
}

function realtimeRelease(row: ReleaseRow): Release {
  return {
    ...rowToRelease(row),
    createdAt: Date.parse(row.published_at ?? row.created_at) || Date.now(),
  };
}

/** Merge candidates into the buffer without duplicating visible or pending posts. */
export function mergeUnseenReleases(
  buffered: Release[],
  candidates: Release[],
  visibleIds: ReadonlySet<string>
): Release[] {
  const seen = new Set<string>(visibleIds);
  const merged: Release[] = [];

  for (const release of [...buffered, ...candidates]) {
    if (release.status !== "Published" || seen.has(release.id)) continue;
    seen.add(release.id);
    merged.push(release);
  }

  return merged.sort((a, b) => releaseTimestamp(b) - releaseTimestamp(a));
}

/** Remove only the selected posts, leaving posts for other feed tabs buffered. */
export function consumeBufferedReleases(
  buffered: Release[],
  ids?: ReadonlySet<string>
): { consumed: Release[]; remaining: Release[] } {
  if (!ids) return { consumed: buffered, remaining: [] };
  const consumed: Release[] = [];
  const remaining: Release[] = [];
  buffered.forEach((release) => (ids.has(release.id) ? consumed : remaining).push(release));
  return { consumed, remaining };
}

interface RealtimeReleasesOptions {
  enabled: boolean;
  ready: boolean;
  visibleIds: ReadonlySet<string>;
}

interface RealtimeReleasesResult {
  buffered: Release[];
  consume: (ids?: ReadonlySet<string>) => Release[];
}

/**
 * Buffers newly published live releases for the feed to consume. Realtime is
 * primary; a one-second initial check and one-minute polling close any gaps.
 */
export function useRealtimeReleases({
  enabled,
  ready,
  visibleIds,
}: RealtimeReleasesOptions): RealtimeReleasesResult {
  const [buffered, setBuffered] = useState<Release[]>([]);
  const bufferedRef = useRef<Release[]>([]);
  const visibleIdsRef = useRef<ReadonlySet<string>>(visibleIds);

  const replaceBuffer = useCallback((next: Release[]) => {
    bufferedRef.current = next;
    setBuffered(next);
  }, []);

  useEffect(() => {
    visibleIdsRef.current = visibleIds;
    const next = bufferedRef.current.filter((release) => !visibleIds.has(release.id));
    if (next.length !== bufferedRef.current.length) replaceBuffer(next);
  }, [visibleIds, replaceBuffer]);

  useEffect(() => {
    if (enabled && ready) return;
    if (bufferedRef.current.length > 0) replaceBuffer([]);
  }, [enabled, ready, replaceBuffer]);

  useEffect(() => {
    if (!enabled || !ready || !isSupabaseConfigured || !supabase) return;

    const client = supabase;
    let active = true;
    let pollTimer: number | null = null;
    let initialPollTimer: number | null = null;
    let pollBusy = false;
    const monitoringStartedAt = Date.now();
    const pendingDetailIds = new Set<string>();

    const addRows = (rows: ReleaseRow[]) => {
      if (!active || rows.length === 0) return;
      const candidates = rows.map(realtimeRelease);
      replaceBuffer(
        mergeUnseenReleases(bufferedRef.current, candidates, visibleIdsRef.current)
      );
    };

    const pollLatest = async () => {
      if (!active || pollBusy) return;
      pollBusy = true;
      try {
        const { data, error } = await client
          .from("release_details")
          .select("*")
          .eq("status", "Published")
          .order("published_at", { ascending: false })
          .limit(100);
        if (active && !error && data) {
          addRows((data as ReleaseRow[]).filter((row) => {
            const publishedAt = Date.parse(row.published_at ?? row.created_at);
            return publishedAt > 0 && publishedAt >= monitoringStartedAt - 120_000;
          }));
        }
      } catch {
        // Keep the last good feed visible; the next poll or Realtime event retries.
      } finally {
        pollBusy = false;
      }
    };

    const schedulePolling = () => {
      if (pollTimer !== null) window.clearInterval(pollTimer);
      pollTimer = window.setInterval(() => void pollLatest(), POLL_INTERVAL_MS);
    };

    const fetchPublishedRelease = async (id: string, publishedSince?: number) => {
      if (
        !active ||
        pendingDetailIds.has(id) ||
        visibleIdsRef.current.has(id) ||
        bufferedRef.current.some((release) => release.id === id)
      ) {
        return;
      }
      pendingDetailIds.add(id);
      try {
        const { data, error } = await client
          .from("release_details")
          .select("*")
          .eq("id", id)
          .eq("status", "Published")
          .maybeSingle();
        if (active && !error && data) {
          const row = data as ReleaseRow;
          const publishedAt = Date.parse(row.published_at ?? "");
          // An UPDATE to an older published row is not a new post. Publishing
          // transitions set published_at near the Realtime commit timestamp.
          if (!publishedSince || (publishedAt > 0 && publishedAt >= publishedSince - 120_000)) {
            addRows([row]);
          }
        }
      } catch {
        // The safety poll will retry if the enriched view was not ready yet.
      } finally {
        pendingDetailIds.delete(id);
      }
    };

    initialPollTimer = window.setTimeout(() => void pollLatest(), INITIAL_POLL_DELAY_MS);
    schedulePolling();

    const channel = client
      .channel(`home-releases-${++channelSequence}`)
      .on<ReleaseRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "releases" },
        (payload) => {
          const next = payload.new as Partial<ReleaseRow>;
          const previous = payload.old as Partial<ReleaseRow>;
          const newlyPublished = payload.eventType === "INSERT"
            || (payload.eventType === "UPDATE" && previous.status !== "Published");
          if (newlyPublished && next.status === "Published" && typeof next.id === "string") {
            const committedAt = Date.parse(payload.commit_timestamp) || Date.now();
            void fetchPublishedRelease(
              next.id,
              payload.eventType === "UPDATE" ? committedAt : undefined
            );
          }
        }
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          schedulePolling();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          void pollLatest();
          schedulePolling();
        }
      });

    return () => {
      active = false;
      if (pollTimer !== null) window.clearInterval(pollTimer);
      if (initialPollTimer !== null) window.clearTimeout(initialPollTimer);
      pendingDetailIds.clear();
      void client.removeChannel(channel);
    };
  }, [enabled, ready, replaceBuffer]);

  const consume = useCallback((ids?: ReadonlySet<string>) => {
    const { consumed, remaining } = consumeBufferedReleases(bufferedRef.current, ids);
    const nextVisibleIds = new Set(visibleIdsRef.current);
    consumed.forEach((release) => nextVisibleIds.add(release.id));
    visibleIdsRef.current = nextVisibleIds;
    replaceBuffer(remaining);
    return consumed;
  }, [replaceBuffer]);

  return { buffered, consume };
}
