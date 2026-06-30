import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { ReleaseCard } from "@/components/release/ReleaseCard";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { Verified } from "@/components/primitives/Bits";
import { FEED_RELEASES, EXPLORE_RELEASES, PROFILE_RELEASES } from "@/data/releases";
import { inst, INSTITUTIONS } from "@/data/institutions";
import { useAppStore } from "@/store/useAppStore";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import { supabase, type ReleaseRow } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { rowToRelease } from "@/lib/releaseMap";
import type { Release } from "@/types";

const FILTERS = ["Latest", "Following", "For You"];

function SuggestRow({ slug }: { slug: string }) {
  const i = inst(slug);
  const following = useAppStore((s) => s.followedSlugs.has(slug));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <InstitutionMark institution={i} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {i.name}
          </span>
          <Verified size={12} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{i.category}</div>
      </div>
      <button
        type="button"
        onClick={() => toggleFollow(slug)}
        className={following ? "pp-btn pp-btn-ghost" : "pp-btn pp-btn-outline"}
        style={{ padding: "5px 13px", fontSize: 12.5 }}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

export function Home() {
  const { configured } = useAuth();
  const followed = useAppStore((s) => s.followedSlugs);
  const navigate = useNavigate();
  const [live, setLive] = useState<Release[]>([]);
  const [tab, setTab] = useState<string>("Latest");

  // LIVE: pull published releases from Postgres (any institution) so a post made
  // on the institution side shows up in a reader's feed and survives refresh.
  useEffect(() => {
    if (!configured || !supabase) return;
    let active = true;
    supabase
      .from("releases")
      .select("*")
      .eq("status", "Published")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active && data) setLive((data as ReleaseRow[]).map(rowToRelease));
      });
    return () => {
      active = false;
    };
  }, [configured]);

  const seen = new Set<string>();
  const base = [...live, ...FEED_RELEASES, ...EXPLORE_RELEASES, ...PROFILE_RELEASES].filter((r) =>
    seen.has(r.id) ? false : (seen.add(r.id), true)
  );
  const feed = tab === "Following" ? base.filter((r) => followed.has(r.institutionSlug)) : base;
  const feedScroll = useInfiniteScroll(feed.length, 8, tab);

  // Trending topics: most-used tags across the current feed (real, not random).
  const tagCounts = new Map<string, number>();
  base.forEach((r) => r.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)));
  const trending = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Suggested: institutions this user doesn't already follow (changes as they follow).
  const suggested = Object.values(INSTITUTIONS)
    .filter((i) => !followed.has(i.slug))
    .slice(0, 4)
    .map((i) => i.slug);

  return (
    <AppShell kind="individual" maxWidth={1180}>
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* main feed */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: 680 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Your Feed</h1>
            <div style={{ display: "flex", gap: 6 }}>
              {FILTERS.map((f) => {
                const active = tab === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTab(f)}
                    style={{
                      fontSize: 13,
                      padding: "6px 13px",
                      borderRadius: "var(--r-pill)",
                      background: active ? "var(--surface-3)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-muted)",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          {feed.length === 0 ? (
            <div className="pp-card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              {tab === "Following"
                ? "You're not following any institutions yet. Follow some to see their releases here."
                : "No releases to show yet."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {feed.slice(0, feedScroll.visible).map((r) => (
                <ReleaseCard key={r.id} release={r} variant="feed" />
              ))}
              {feedScroll.hasMore && <div ref={feedScroll.sentinelRef} style={{ height: 1 }} />}
            </div>
          )}
        </div>

        {/* right rail */}
        <aside style={{ width: 304, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 0 }}>
          <section className="pp-card" style={{ padding: 18 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
              <TrendingUp size={16} color="var(--green)" /> Trending Topics
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {trending.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No topics yet.</span>
              ) : (
                trending.map(([topic, count], i) => (
                  <button key={topic} type="button" onClick={() => navigate("/explore")} style={{ display: "flex", alignItems: "center", gap: 11, textAlign: "left" }}>
                    <span style={{ fontSize: 13, color: "var(--text-faint)", width: 14 }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 500 }}>#{topic.replace(/\s/g, "")}</span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{count} {count === 1 ? "release" : "releases"}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="pp-card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Suggested for you</h2>
            {suggested.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>You follow everyone we know about!</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {suggested.map((s) => (
                  <SuggestRow key={s} slug={s} />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
