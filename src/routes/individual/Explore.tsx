import { useState } from "react";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import { AppShell } from "@/components/shells/AppShell";
import { ReleaseCard } from "@/components/release/ReleaseCard";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { Verified } from "@/components/primitives/Bits";
import { EXPLORE_RELEASES, FEED_RELEASES, PROFILE_RELEASES } from "@/data/releases";
import { inst } from "@/data/institutions";
import { useAppStore } from "@/store/useAppStore";
import type { Release } from "@/types";

const CATEGORIES = ["For You", "Government", "Economy", "Environment", "Health", "Education", "Technology"];
const DISCOVER = ["imf", "oecd", "ecb", "united-nations", "world-bank", "senedd-cymru"];

const EXPLORE_POOL: Release[] = (() => {
  const seen = new Set<string>();
  const out: Release[] = [];
  for (const r of [...EXPLORE_RELEASES, ...FEED_RELEASES, ...PROFILE_RELEASES]) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
})();

function DiscoverCard({ slug }: { slug: string }) {
  const i = inst(slug);
  const following = useAppStore((s) => s.followedSlugs.has(slug));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  return (
    <div
      className="pp-card"
      style={{ padding: 16, width: 210, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 4 }}
    >
      <InstitutionMark institution={i} size={48} />
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{i.name}</span>
        <Verified size={12} />
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{i.category}</div>
      <button
        type="button"
        onClick={() => toggleFollow(slug)}
        className={following ? "pp-btn pp-btn-ghost" : "pp-btn pp-btn-blue"}
        style={{ padding: "6px 18px", fontSize: 13, marginTop: 10, width: "100%" }}
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

export function Explore() {
  const [cat, setCat] = useState("For You");

  const matches = (text: string) => text.toLowerCase().includes(cat.toLowerCase());
  const all = cat === "For You";

  const institutions = all ? DISCOVER : DISCOVER.filter((s) => matches(inst(s).category) || matches(inst(s).name));
  const pool = EXPLORE_POOL;
  const releases = all
    ? pool
    : pool.filter((r) => matches(inst(r.institutionSlug).category) || matches(r.type) || r.tags.some((t) => matches(t)));
  const relScroll = useInfiniteScroll(releases.length, 8, cat);

  return (
    <AppShell kind="individual" maxWidth={920}>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Explore</h1>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
        Discover institutions and official releases from around the world.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              style={{
                fontSize: 13,
                padding: "7px 15px",
                borderRadius: "var(--r-pill)",
                border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                background: active ? "var(--surface-3)" : "transparent",
                color: active ? "var(--text)" : "var(--text-secondary)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 28, marginBottom: 14 }}>Institutions to follow</h2>
      {institutions.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>No institutions in {cat} yet.</p>
      ) : (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6 }}>
          {institutions.map((s) => (
            <DiscoverCard key={s} slug={s} />
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 30, marginBottom: 14 }}>
        {all ? "Trending releases" : `${cat} releases`}
      </h2>
      {releases.length === 0 ? (
        <div className="pp-card" style={{ padding: 36, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          No {cat} releases right now. Try another category.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {releases.slice(0, relScroll.visible).map((r) => (
            <ReleaseCard key={r.id} release={r} variant="feed" showFollow />
          ))}
          {relScroll.hasMore && <div ref={relScroll.sentinelRef} style={{ height: 1 }} />}
        </div>
      )}
    </AppShell>
  );
}
