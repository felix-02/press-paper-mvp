import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Sparkles,
  Check,
  Languages,
  Send,
  MessageSquare,
  Eye,
} from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { MediaTile } from "@/components/media/MediaTile";
import { TypeBadge } from "@/components/release/ReleaseTypeBadge";
import { Verified } from "@/components/primitives/Bits";
import { inst } from "@/data/institutions";
import {
  findRelease,
  FEED_RELEASES,
  HERO_RELEASE_ID,
  HERO_OVERVIEW,
  HERO_KEY_POINTS,
  HERO_SUMMARY,
  HERO_OVERVIEW_CY,
  HERO_KEY_POINTS_CY,
  HERO_SUMMARY_CY,
  HERO_TITLE_CY,
  HERO_SUBTITLE_CY,
  ASK_ANYTHING,
  HERO_COMMENTS,
} from "@/data/releases";
import type { Comment, MediaScene, Release } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { supabase, isSupabaseConfigured, type ReleaseRow } from "@/lib/supabase";
import { rowToRelease } from "@/lib/releaseMap";
import { useAiSummary } from "@/lib/useAiSummary";
import { track } from "@/lib/analytics";
import { ShareMenu } from "@/components/common/ShareMenu";
import { CommentThread } from "@/components/release/CommentThread";
import { TagList } from "@/components/common/TagList";
import { LanguageMenu } from "@/components/common/LanguageMenu";
import { AddToWatchlist } from "@/components/common/AddToWatchlist";
import { translateTexts, isTranslationAvailable } from "@/lib/translate";
import { useReleaseEngagement } from "@/lib/useReleaseEngagement";

interface Content {
  overview: string;
  keyPoints: string[];
  summary: string;
  cy?: { title: string; subtitle: string; overview: string; keyPoints: string[]; summary: string };
  ask: { q: string; a: string }[];
  comments: Comment[];
}

function buildContent(release: Release): Content {
  if (release.id === HERO_RELEASE_ID) {
    return {
      overview: HERO_OVERVIEW,
      keyPoints: HERO_KEY_POINTS,
      summary: HERO_SUMMARY,
      cy: {
        title: HERO_TITLE_CY,
        subtitle: HERO_SUBTITLE_CY,
        overview: HERO_OVERVIEW_CY,
        keyPoints: HERO_KEY_POINTS_CY,
        summary: HERO_SUMMARY_CY,
      },
      ask: ASK_ANYTHING,
      comments: HERO_COMMENTS,
    };
  }
  // Generic, content-derived view for any other release.
  const overview = `${release.subheading} This release forms part of the institution's ongoing programme of public information and is published here in full for transparency.`;
  const keyPoints = (release.tags.length ? release.tags : ["Public Information"]).map(
    (t) => `Provides detail on ${t.toLowerCase()} and its implications.`
  );
  keyPoints.push("Published directly by a verified institution on Presspaper.");
  return {
    overview,
    keyPoints,
    summary: release.subheading,
    ask: [
      { q: "What is this release about?", a: release.subheading },
      {
        q: "Why does it matter?",
        a: "It sets out official information from a verified institution, helping the public stay informed directly from the source.",
      },
    ],
    comments: [],
  };
}

const THUMBS: MediaScene[] = ["parliament", "town", "coast"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function RailPanel({ title, icon, children, accent }: { title: string; icon?: React.ReactNode; children: React.ReactNode; accent?: string }) {
  return (
    <section className="pp-card" style={{ padding: 16 }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 600, marginBottom: 12, color: accent ?? "var(--text)" }}>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FullRelease() {
  const { id = HERO_RELEASE_ID } = useParams();
  const navigate = useNavigate();

  const staticMatch = useMemo(() => findRelease(id), [id]);
  const [dbRelease, setDbRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState<boolean>(!staticMatch && isSupabaseConfigured);

  // LIVE: if it isn't one of the demo releases, fetch it from Postgres by id so
  // a freshly published post is fully readable.
  useEffect(() => {
    if (staticMatch || !isSupabaseConfigured || !supabase) return;
    let active = true;
    setLoading(true);
    supabase
      .from("releases")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setDbRelease(data ? rowToRelease(data as ReleaseRow) : null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, staticMatch]);

  // Always a valid object so the hooks below run unconditionally; while a live
  // release is loading we render a spinner (after all hooks).
  const release = staticMatch ?? dbRelease ?? FEED_RELEASES[0];
  const content = useMemo(() => buildContent(release), [release]);
  const i = inst(release.institutionSlug);

  const [lang, setLang] = useState<string>("English");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [draft, setDraft] = useState("");

  const saved = useAppStore((s) => s.savedIds.has(release.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const following = useAppStore((s) => s.followedSlugs.has(i.slug));
  const toggleFollow = useAppStore((s) => s.toggleFollow);
  const pushToast = useAppStore((s) => s.pushToast);

  // AI summary via the Edge Function (falls back to the canned summary).
  const ai = useAiSummary(release, content.summary, content.overview);

  // Real, per-release engagement (views counter + real comment count).
  const eng = useReleaseEngagement(release.id, 0, 0);

  // Count a view once per release: analytics for all, DB counter for real ones.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewedRef.current === release.id) return;
    viewedRef.current = release.id;
    track("release_viewed", { id: release.id, type: release.type });
    if (!isSupabaseConfigured || !supabase) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(release.id);
    if (!isUuid) return;
    void supabase.rpc("increment_release_views", { rid: release.id }).then(
      () => {},
      () => {}
    );
  }, [release.id]);

  const cy = content.cy;
  const [tr, setTr] = useState<{ title: string; subtitle: string; overview: string; keyPoints: string[]; summary: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    let active = true;
    if (lang === "English") {
      setTr(null);
      return;
    }
    // Welsh has a hand-written translation that works offline.
    if (lang.startsWith("Welsh") && cy) {
      setTr({ title: cy.title, subtitle: cy.subtitle, overview: cy.overview, keyPoints: cy.keyPoints, summary: cy.summary });
      return;
    }
    if (!isTranslationAvailable()) {
      pushToast({ title: "Translation unavailable", description: "Deploy the translate function to enable other languages.", variant: "info" });
      setLang("English");
      return;
    }
    setTranslating(true);
    const kp = content.keyPoints;
    const fields = [release.heading, release.subheading, content.overview, ...kp, ai.summary];
    translateTexts(lang, fields).then((out) => {
      if (!active) return;
      setTranslating(false);
      if (out === fields || out.length !== fields.length) {
        pushToast({ title: "Couldn't translate", description: "Please try again.", variant: "info" });
        setLang("English");
        return;
      }
      setTr({
        title: out[0],
        subtitle: out[1],
        overview: out[2],
        keyPoints: out.slice(3, 3 + kp.length),
        summary: out[3 + kp.length],
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, release.id]);

  const translated = lang !== "English" && !!tr;
  const title = translated ? tr!.title : release.heading;
  const subtitle = translated ? tr!.subtitle : release.subheading;
  const overview = translated ? tr!.overview : content.overview;
  const keyPoints = translated ? tr!.keyPoints : content.keyPoints;
  const summary = translated ? tr!.summary : ai.summary;

  // Rich body authored via the WYSIWYG editor is HTML — render it (lightly
  // sanitised). Plain/empty bodies fall back to the structured overview.
  const bodyIsHtml = !!release.body && /<[a-z][\s\S]*>/i.test(release.body);
  const safeBody = bodyIsHtml && release.body
    ? release.body
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/javascript:/gi, "")
    : "";

  const onSave = () => {
    const now = toggleSaved(release.id);
    pushToast({ title: now ? "Saved" : "Removed from saved", variant: now ? "success" : "info" });
  };

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(release.id);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = isUuid ? `${origin}/r/${release.id}` : `${origin}/#/release/${release.id}`;


  const answered = new Set(thread.map((t) => t.q));
  const suggestions = content.ask.filter((a) => !answered.has(a.q));

  const askQuestion = (q: string, a: string) => setThread((t) => [...t, { q, a }]);
  const submitDraft = () => {
    const q = draft.trim();
    if (!q) return;
    const known = content.ask.find((x) => x.q.toLowerCase() === q.toLowerCase());
    askQuestion(q, known ? known.a : `Based on this release: ${content.summary}`);
    setDraft("");
  };

  if (loading) {
    return (
      <AppShell kind="individual" maxWidth={1080}>
        <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, border: "3px solid var(--surface-3)", borderTopColor: "var(--blue)", animation: "pp-spin 0.8s linear infinite" }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell kind="individual" maxWidth={1080}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="pp-link-muted"
        style={{ marginBottom: 18, fontSize: 13.5 }}
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* institution + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <InstitutionMark institution={i} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{i.name}</span>
            <Verified size={14} />
            <button
              type="button"
              onClick={() => toggleFollow(i.slug)}
              style={{ fontSize: 12.5, color: following ? "var(--text-muted)" : "var(--blue)", fontWeight: 600, marginLeft: 4 }}
            >
              {following ? "· Following" : "· Follow"}
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 1 }}>{release.time}</div>
        </div>
        <button type="button" onClick={onSave} className={saved ? "pp-btn pp-btn-ghost" : "pp-btn pp-btn-outline"}>
          <Bookmark size={15} fill={saved ? "var(--blue)" : "none"} color={saved ? "var(--blue)" : "currentColor"} />
          {saved ? "Saved" : "Save"}
        </button>
        <ShareMenu url={shareUrl} title={release.heading} />
        <AddToWatchlist releaseId={release.id} />
      </div>

      {/* title */}
      <div style={{ marginTop: 18 }}>
        <TypeBadge type={release.type} />
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, marginTop: 12 }}>{title}</h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 12, maxWidth: 720 }}>{subtitle}</p>

        {/* live engagement + tags */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            <Eye size={15} /> {eng.isLiveViews ? eng.views.toLocaleString() : release.views} views
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            <MessageSquare size={15} /> {eng.isLiveComments ? eng.comments.toLocaleString() : release.comments} comments
          </span>
          {release.tags.length > 0 && <TagList tags={release.tags} max={3} />}
        </div>
      </div>

      {/* media gallery */}
      <div style={{ marginTop: 22 }}>
        <div style={{ height: 360, width: "100%" }}>
          <MediaTile scene={release.scene} play playable playPos="center" radius={16} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          {[release.scene, ...THUMBS].slice(0, 4).map((s, idx) => (
            <div key={idx} style={{ height: 70, flex: 1, opacity: idx === 0 ? 1 : 0.85 }}>
              <MediaTile scene={s} radius={10} />
            </div>
          ))}
        </div>
      </div>

      {/* body grid */}
      <div style={{ display: "flex", gap: 32, marginTop: 8, alignItems: "flex-start" }}>
        {/* main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {translated && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                color: "var(--blue)",
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: "var(--r-pill)",
                padding: "5px 12px",
                marginTop: 24,
              }}
            >
              <Languages size={14} /> Translated to {lang.replace(/\s*\(.*\)$/, "")}
            </div>
          )}

          <Section title="Overview">
            {!translated && bodyIsHtml ? (
              <div className="pp-prose" dangerouslySetInnerHTML={{ __html: safeBody }} />
            ) : (
              <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7 }}>{overview}</p>
            )}
          </Section>

          {!bodyIsHtml && (
            <Section title="Key Points">
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {keyPoints.map((p, idx) => (
                  <li key={idx} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <span style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(52,211,153,0.14)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                      <Check size={13} color="var(--green)" strokeWidth={2.5} />
                    </span>
                    <span style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{p}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* comments */}
          <Section title="Comments">
            <CommentThread releaseId={release.id} seed={[]} />
          </Section>
        </div>

        {/* rail */}
        <aside style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0, marginTop: 24 }}>
          {/* translate */}
          <RailPanel title="Translate" icon={<Languages size={16} color="var(--text-muted)" />}>
            <LanguageMenu value={lang} onChange={setLang} busy={translating} />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
              Read this release in your preferred language. English is shown by default.
            </p>
          </RailPanel>

          {/* AI summary */}
          <RailPanel title="AI Summary" icon={<Sparkles size={16} color="var(--purple)" />} accent="var(--text)">
            {(ai.loading && !translated) || translating ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[100, 92, 70].map((w) => (
                  <div key={w} style={{ height: 11, width: `${w}%`, borderRadius: 4, background: "linear-gradient(90deg, var(--surface-2), var(--surface-3), var(--surface-2))", backgroundSize: "200% 100%", animation: "pp-shimmer 1.2s ease-in-out infinite" }} />
                ))}
                <span style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={11} /> {translating ? "Translating…" : "Summarising…"}
                </span>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.65 }}>{summary}</p>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={11} /> {ai.isAi && !translated ? "Generated by Presspaper AI" : "Presspaper AI"}
                </div>
              </>
            )}
          </RailPanel>

          {/* ask anything */}
          <RailPanel title="Ask Anything" icon={<Sparkles size={16} color="var(--blue)" />}>
            {thread.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
                {thread.map((t, idx) => (
                  <div key={idx} className="pp-fade">
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 12.5, background: "var(--blue-bright)", color: "#fff", padding: "7px 11px", borderRadius: "12px 12px 4px 12px", maxWidth: "85%" }}>
                        {t.q}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 999, background: "rgba(59,130,246,0.14)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Sparkles size={12} color="var(--blue)" />
                      </span>
                      <span style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>{t.a}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {suggestions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                {thread.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>Suggested questions</span>
                )}
                {suggestions.map((s) => (
                  <button
                    key={s.q}
                    type="button"
                    onClick={() => askQuestion(s.q, s.a)}
                    style={{
                      textAlign: "left",
                      fontSize: 13,
                      color: "var(--text)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      padding: "9px 12px",
                      transition: "border-color 0.14s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    {s.q}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="pp-input"
                placeholder="Ask about this release…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitDraft()}
                style={{ padding: "9px 12px", fontSize: 13 }}
              />
              <button
                type="button"
                onClick={submitDraft}
                className="pp-btn pp-btn-blue"
                style={{ padding: "9px 11px", flexShrink: 0 }}
                aria-label="Send question"
              >
                <Send size={15} />
              </button>
            </div>
          </RailPanel>
        </aside>
      </div>
    </AppShell>
  );
}
