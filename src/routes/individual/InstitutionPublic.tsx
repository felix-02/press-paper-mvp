import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Globe, MapPin, ArrowUpRight, FileText } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { ReleaseCard } from "@/components/release/ReleaseCard";
import { Verified } from "@/components/primitives/Bits";
import { inst } from "@/data/institutions";
import { PROFILE_RELEASES, FEED_RELEASES, EXPLORE_RELEASES, SAVED_RELEASES } from "@/data/releases";
import { useAppStore } from "@/store/useAppStore";
import { supabase, isSupabaseConfigured, type ReleaseRow } from "@/lib/supabase";
import { rowToRelease, formatCount } from "@/lib/releaseMap";
import type { Release } from "@/types";

const TABS = ["Releases", "About", "Activity"];

// All static releases, deduped — used to show each institution ONLY its own.
const ALL_STATIC = (() => {
  const seen = new Set<string>();
  const out: Release[] = [];
  for (const r of [...FEED_RELEASES, ...EXPLORE_RELEASES, ...PROFILE_RELEASES, ...SAVED_RELEASES]) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
})();

function HeaderStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <span style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 6 }}>{label}</span>
    </div>
  );
}

export function InstitutionPublic() {
  const { slug = "welsh-government" } = useParams();
  const i = inst(slug);
  const following = useAppStore((s) => s.followedSlugs.has(i.slug));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  const pushToast = useAppStore((s) => s.pushToast);

  const staticReleases = ALL_STATIC.filter((r) => r.institutionSlug === slug);
  const [liveReleases, setLiveReleases] = useState<Release[]>([]);
  const [params, setParams] = useSearchParams();
  const tabParam = (params.get("tab") || "releases").toLowerCase();
  const tab = tabParam === "about" ? "About" : tabParam === "activity" ? "Activity" : "Releases";
  const setTab = (t: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", t.toLowerCase());
    setParams(p);
  };
  const [liveFollowers, setLiveFollowers] = useState<number | null>(null);

  // LIVE: this institution's real published releases + real follower count.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase
      .from("releases")
      .select("*")
      .eq("institution_slug", slug)
      .eq("status", "Published")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) setLiveReleases((data as ReleaseRow[]).map(rowToRelease));
      });
    supabase
      .from("institution_stats")
      .select("followers_count")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setLiveFollowers((data as { followers_count: number } | null)?.followers_count ?? 0);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const seen = new Set<string>();
  const releases = [...liveReleases, ...staticReleases].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));

  const onFollow = () => {
    const now = toggleFollow(i.slug);
    if (liveFollowers !== null) setLiveFollowers((c) => (c ?? 0) + (now ? 1 : -1));
    pushToast({ title: now ? `Following ${i.name}` : `Unfollowed ${i.name}`, variant: now ? "success" : "info" });
  };

  return (
    <AppShell kind="individual" maxWidth={900}>
      {/* header */}
      <div className="pp-card" style={{ overflow: "hidden" }}>
        <div
          style={{
            height: 120,
            background: `linear-gradient(125deg, ${i.color} 0%, ${i.color2 ?? i.color} 100%)`,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
        </div>
        <div style={{ padding: "0 24px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -36 }}>
            <div style={{ borderRadius: 18, border: "4px solid var(--surface-1)", lineHeight: 0 }}>
              <InstitutionMark institution={i} size={84} shape="square" />
            </div>
            <div style={{ display: "flex", gap: 10, paddingBottom: 6 }}>
              <button type="button" onClick={(e) => e.preventDefault()} className="pp-btn pp-btn-ghost">
                <Globe size={15} /> Visit website
              </button>
              <button
                type="button"
                onClick={onFollow}
                className={following ? "pp-btn pp-btn-ghost" : "pp-btn pp-btn-blue"}
                style={{ minWidth: 104 }}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em" }}>{i.name}</h1>
            <Verified size={17} />
          </div>
          {i.subName && <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>{i.subName}</div>}

          <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 13, color: "var(--text-muted)", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{i.category}</span>
            {i.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} /> {i.location}
              </span>
            )}
            {i.website && (
              <a href={`https://${i.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--blue)" }}>
                {i.website} <ArrowUpRight size={13} />
              </a>
            )}
          </div>

          <div style={{ display: "flex", gap: 26, marginTop: 18 }}>
            <HeaderStat value={formatCount(liveFollowers ?? 0)} label="followers" />
            <HeaderStat value={String(releases.length)} label="releases" />
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginTop: 26, marginBottom: 22 }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                padding: "10px 4px",
                marginRight: 18,
                color: active ? "var(--text)" : "var(--text-muted)",
                borderBottom: `2px solid ${active ? "var(--text)" : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === "Releases" && (
        releases.length === 0 ? (
          <div className="pp-card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
            No releases published yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {releases.map((r) => (
              <ReleaseCard key={r.id} release={r} variant="saved" />
            ))}
          </div>
        )
      )}

      {tab === "About" && (
        <div className="pp-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>About {i.name}</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 12, columnGap: 18, fontSize: 14 }}>
            {i.subName && (<><dt style={aboutDt}>Also known as</dt><dd style={aboutDd}>{i.subName}</dd></>)}
            <dt style={aboutDt}>Category</dt><dd style={aboutDd}>{i.category}</dd>
            {i.location && (<><dt style={aboutDt}>Location</dt><dd style={aboutDd}>{i.location}</dd></>)}
            {i.website && (
              <>
                <dt style={aboutDt}>Website</dt>
                <dd style={aboutDd}>
                  <a href={`https://${i.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)" }}>
                    {i.website.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </>
            )}
            <dt style={aboutDt}>Verification</dt>
            <dd style={aboutDd}>{i.verified ? "Verified institution" : "Unverified"}</dd>
            <dt style={aboutDt}>Followers</dt>
            <dd style={aboutDd}>{(liveFollowers ?? 0).toLocaleString()}</dd>
            <dt style={aboutDt}>Releases</dt>
            <dd style={aboutDd}>{releases.length}</dd>
          </dl>
        </div>
      )}

      {tab === "Activity" && (
        releases.length === 0 ? (
          <div className="pp-card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
            No activity yet.
          </div>
        ) : (
          <div className="pp-card" style={{ padding: 6 }}>
            {releases.map((r) => (
              <Link key={r.id} to={`/release/${r.id}`} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 12px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(59,130,246,0.12)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                  <FileText size={15} color="var(--blue)" />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5 }}>
                    Published <strong>{r.heading}</strong>
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{r.type} · {r.publishedDate ?? r.time}</span>
                </span>
              </Link>
            ))}
          </div>
        )
      )}
    </AppShell>
  );
}

const aboutDt: React.CSSProperties = { color: "var(--text-muted)", fontSize: 13 };
const aboutDd: React.CSSProperties = { color: "var(--text)", margin: 0 };
