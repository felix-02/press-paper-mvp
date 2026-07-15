import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark, Plus, Trash2, ListChecks, X, Pencil, Check } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { ReleaseCard } from "@/components/release/ReleaseCard";
import { useResolvedSaved } from "@/lib/useResolvedSaved";
import { useWatchlists } from "@/lib/useWatchlists";
import { useAppStore } from "@/store/useAppStore";

const TABS = ["Saved", "Watchlists"];

export function Saved() {
  const { releases, loading, error } = useResolvedSaved();
  const [params, setParams] = useSearchParams();
  const urlTab = (params.get("tab") || "saved").toLowerCase();
  const tab = urlTab === "watchlists" ? "Watchlists" : "Saved";
  const setTab = (t: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", t.toLowerCase());
    setParams(p);
  };

  return (
    <AppShell kind="individual" maxWidth={860}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0" }}>Saved</h1>
        {tab === "Saved" && (
          <span style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
            {releases.length} {releases.length === 1 ? "release" : "releases"}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginTop: 16, marginBottom: 22 }}>
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

      {tab === "Saved" ? (
        error ? (
          <div className="pp-card" role="alert" style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5 }}>{error}</div>
        ) : loading && releases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-muted)", fontSize: 13.5 }}>Loading saved releases…</div>
        ) : releases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 20px", color: "var(--text-muted)" }}>
            <Bookmark size={34} style={{ opacity: 0.4 }} />
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-secondary)", marginTop: 14 }}>No saved releases yet</p>
            <p style={{ fontSize: 13.5, marginTop: 6 }}>Tap the bookmark on any release to save it here for later.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {releases.map((r) => (
              <ReleaseCard key={r.id} release={r} variant="saved" />
            ))}
          </div>
        )
      ) : (
        <WatchlistsPanel />
      )}
    </AppShell>
  );
}

function WatchlistsPanel() {
  const { lists, available, loading, error, refresh, create, remove, rename } = useWatchlists();
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!available) {
    return (
      <div style={{ textAlign: "center", padding: "70px 20px", color: "var(--text-muted)" }}>
        <ListChecks size={34} style={{ opacity: 0.4 }} />
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-secondary)", marginTop: 14 }}>Watchlists need a live account</p>
        <p style={{ fontSize: 13.5, marginTop: 6 }}>Sign in with Supabase configured to create and use watchlists.</p>
      </div>
    );
  }

  const submitCreate = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    const wl = await create(n);
    setBusy(false);
    pushToast({ title: wl ? `Created "${n}"` : "Couldn't create watchlist", variant: wl ? "success" : "info" });
    if (wl) {
      setName("");
      setCreating(false);
      navigate(`/watchlist/${wl.id}`);
    }
  };

  const submitRename = async (id: string) => {
    const n = editName.trim();
    if (!n) return;
    const renamed = await rename(id, n);
    if (renamed) setEditingId(null);
    pushToast({ title: renamed ? "Watchlist renamed" : "Couldn't rename watchlist", variant: renamed ? "success" : "info" });
  };

  const onDelete = async (id: string, listName: string) => {
    if (!window.confirm(`Delete the watchlist "${listName}"? This can't be undone.`)) return;
    const removed = await remove(id);
    pushToast({ title: removed ? "Watchlist deleted" : "Couldn't delete watchlist", variant: "info" });
  };

  return (
    <div>
      {error && (
        <div className="pp-card" role="alert" style={{ padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 13.5 }}>{error}</span>
          <button type="button" className="pp-btn pp-btn-outline" onClick={() => void refresh()}>Retry</button>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        {creating ? (
          <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 360 }}>
            <input className="pp-input" placeholder="Watchlist name" value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submitCreate()} />
            <button type="button" onClick={() => void submitCreate()} disabled={!name.trim() || busy} className="pp-btn pp-btn-primary" style={{ opacity: name.trim() && !busy ? 1 : 0.6, flexShrink: 0 }}>
              {busy ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="pp-btn pp-btn-ghost" style={{ flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setCreating(true)} className="pp-btn pp-btn-primary">
            <Plus size={16} /> New watchlist
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: 13.5 }}>Loading watchlists…</div>
      ) : lists.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <ListChecks size={34} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-secondary)", marginTop: 14 }}>No watchlists yet</p>
          <p style={{ fontSize: 13.5, marginTop: 6 }}>Create one, then add releases from any release page.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {lists.map((l) => (
            <div key={l.id} className="pp-card" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              {editingId === l.id ? (
                <div style={{ display: "flex", gap: 6, flex: 1 }}>
                  <input
                    className="pp-input"
                    value={editName}
                    maxLength={80}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitRename(l.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    style={{ padding: "6px 9px", fontSize: 13 }}
                  />
                  <button type="button" onClick={() => submitRename(l.id)} className="pp-btn pp-btn-blue" style={{ padding: "6px 10px", flexShrink: 0 }}>
                    <Check size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => navigate(`/watchlist/${l.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", flex: 1, minWidth: 0 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59,130,246,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <ListChecks size={19} color="var(--blue)" />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--text-muted)" }}>{l.count} {l.count === 1 ? "release" : "releases"}</span>
                    </span>
                  </button>
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(l.id);
                        setEditName(l.name);
                      }}
                      aria-label="Rename watchlist"
                      style={{ color: "var(--text-muted)", padding: 6 }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button type="button" onClick={() => onDelete(l.id, l.name)} aria-label="Delete watchlist" style={{ color: "var(--text-muted)", padding: 6 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
