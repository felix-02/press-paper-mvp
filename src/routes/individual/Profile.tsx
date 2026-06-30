import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, CalendarDays, LogOut, Settings, Bookmark, UserPlus, X } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { Avatar } from "@/components/brand/Avatar";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { ReleaseCard } from "@/components/release/ReleaseCard";
import { Verified } from "@/components/primitives/Bits";
import { inst } from "@/data/institutions";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/auth/AuthProvider";
import { useResolvedSaved } from "@/lib/useResolvedSaved";
import { useActivity, relativeTime } from "@/lib/useActivity";
import { supabase } from "@/lib/supabase";

const TABS = ["Following", "Saved", "Activity"];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 19, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function Profile() {
  const reset = useAppStore((s) => s.reset);
  const followed = useAppStore((s) => s.followedSlugs);
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();
  const { configured, signOut, profile, refreshProfile, user } = useAuth();
  const { releases: saved } = useResolvedSaved();
  const activity = useActivity();
  const followedSlugs = [...followed];
  const [params, setParams] = useSearchParams();
  const tabParam = (params.get("tab") || "following").toLowerCase();
  const tab = tabParam === "saved" ? "Saved" : tabParam === "activity" ? "Activity" : "Following";
  const setTab = (t: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", t.toLowerCase());
    setParams(p);
  };
  const [editing, setEditing] = useState(false);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "You";
  const handle = "@" + (profile?.full_name?.split(" ")[0]?.toLowerCase() || user?.email?.split("@")[0] || "you");

  const logout = async () => {
    if (configured) {
      await signOut();
      navigate("/login");
      return;
    }
    reset();
    navigate("/");
  };

  return (
    <AppShell kind="individual" maxWidth={900}>
      {/* header card */}
      <div className="pp-card" style={{ overflow: "hidden" }}>
        <div style={{ height: 96, background: "linear-gradient(120deg, #2563eb 0%, #6366f1 55%, #0ea5e9 100%)" }} />
        <div style={{ padding: "0 24px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -34 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              <div style={{ borderRadius: 999, border: "4px solid var(--surface-1)", lineHeight: 0 }}>
                <Avatar size={88} name={displayName} />
              </div>
              <div style={{ paddingBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{displayName}</h1>
                  <Verified size={16} />
                </div>
                <div style={{ fontSize: 13.5, color: "var(--text-muted)" }}>{handle}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, paddingBottom: 6 }}>
              <button type="button" onClick={() => setEditing(true)} className="pp-btn pp-btn-ghost">
                <Settings size={15} /> Edit Profile
              </button>
              <button type="button" onClick={logout} className="pp-btn pp-btn-outline">
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>

          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 16, maxWidth: 560, lineHeight: 1.55 }}>
            Following public policy, infrastructure and economic affairs across Wales and beyond. Here for the primary sources.
          </p>

          <div style={{ display: "flex", gap: 20, marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MapPin size={14} /> Cardiff, Wales
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <CalendarDays size={14} /> Joined March 2024
            </span>
          </div>

          <div style={{ display: "flex", gap: 34, marginTop: 20 }}>
            <Stat value={String(followedSlugs.length)} label="Following" />
            <Stat value={String(saved.length)} label="Saved" />
            <Stat value="2" label="Watchlists" />
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

      {tab === "Following" && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Institutions you follow</h2>
          {followedSlugs.length === 0 ? (
            <div className="pp-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
              You're not following any institutions yet. Explore sources and follow the ones you care about.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {followedSlugs.map((slug) => {
                const i = inst(slug);
                return (
                  <Link key={slug} to={`/institution/${slug}`} className="pp-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 11 }}>
                    <InstitutionMark institution={i} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.name}</span>
                        <Verified size={11} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{i.category}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "Saved" && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Saved releases</h2>
          {saved.length === 0 ? (
            <div className="pp-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
              Nothing saved yet. Tap the bookmark on any release to keep it here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {saved.map((r) => (
                <ReleaseCard key={r.id} release={r} variant="saved" />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "Activity" && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Recent activity</h2>
          {activity.available ? (
            activity.loading ? (
              <div className="pp-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>Loading…</div>
            ) : activity.items.length === 0 ? (
              <div className="pp-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
                No activity yet. Follow institutions and save releases to see them here.
              </div>
            ) : (
              <div className="pp-card" style={{ padding: 6 }}>
                {activity.items.map((a) =>
                  a.kind === "save" ? (
                    <Link key={a.key} to={`/release/${a.releaseId}`} style={activityRow}>
                      <span style={activityIcon("rgba(59,130,246,0.12)")}>
                        <Bookmark size={15} color="var(--blue)" />
                      </span>
                      <span style={{ fontSize: 13.5, flex: 1 }}>
                        You saved <strong>{a.heading}</strong>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{relativeTime(a.ts)}</span>
                    </Link>
                  ) : (
                    <Link key={a.key} to={`/institution/${a.slug}`} style={activityRow}>
                      <span style={activityIcon("rgba(52,211,153,0.14)")}>
                        <UserPlus size={15} color="var(--green)" />
                      </span>
                      <span style={{ fontSize: 13.5, flex: 1 }}>
                        You followed <strong>{inst(a.slug!).name}</strong>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{relativeTime(a.ts)}</span>
                    </Link>
                  )
                )}
              </div>
            )
          ) : followedSlugs.length === 0 && saved.length === 0 ? (
            <div className="pp-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
              No activity yet. Follow institutions and save releases to see them here.
            </div>
          ) : (
            <div className="pp-card" style={{ padding: 6 }}>
              {saved.map((r) => (
                <Link key={`s-${r.id}`} to={`/release/${r.id}`} style={activityRow}>
                  <span style={activityIcon("rgba(59,130,246,0.12)")}>
                    <Bookmark size={15} color="var(--blue)" />
                  </span>
                  <span style={{ fontSize: 13.5 }}>
                    You saved <strong>{r.heading}</strong>
                  </span>
                </Link>
              ))}
              {followedSlugs.map((slug) => {
                const i = inst(slug);
                return (
                  <Link key={`f-${slug}`} to={`/institution/${slug}`} style={activityRow}>
                    <span style={activityIcon("rgba(52,211,153,0.14)")}>
                      <UserPlus size={15} color="var(--green)" />
                    </span>
                    <span style={{ fontSize: 13.5 }}>
                      You followed <strong>{i.name}</strong>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {editing && (
        <EditProfileModal
          initialName={profile?.full_name ?? ""}
          onClose={() => setEditing(false)}
          onSave={async (name) => {
            if (configured && supabase && user) {
              const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
              if (error) {
                pushToast({ title: "Couldn't save", description: error.message, variant: "info" });
                return;
              }
              await refreshProfile();
            }
            setEditing(false);
            pushToast({ title: "Profile updated", variant: "success" });
          }}
        />
      )}
    </AppShell>
  );
}

const activityRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "11px 12px",
  borderBottom: "1px solid var(--border)",
};
const activityIcon = (bg: string): React.CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: 999,
  background: bg,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
});

function EditProfileModal({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="pp-card" style={{ width: "100%", maxWidth: 440, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Edit profile</h3>
          <button type="button" onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>
        <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Full name</label>
        <input className="pp-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} className="pp-btn pp-btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            className="pp-btn pp-btn-primary"
            disabled={saving || !name.trim()}
            onClick={async () => {
              setSaving(true);
              await onSave(name.trim());
              setSaving(false);
            }}
            style={{ opacity: saving || !name.trim() ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
