import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, ListChecks } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { ReleaseCard } from "@/components/release/ReleaseCard";
import { useWatchlists } from "@/lib/useWatchlists";
import { resolveReleases } from "@/lib/releaseResolve";
import type { Release } from "@/types";
import { useAppStore } from "@/store/useAppStore";

export function WatchlistView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { lists, available, loading: loadingLists, error, refresh, itemIds, removeItem } = useWatchlists();
  const pushToast = useAppStore((state) => state.pushToast);
  const list = lists.find((l) => l.id === id);
  const ids = itemIds(id);
  const idsKey = ids.join(",");
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingLists) return;
    let active = true;
    setLoading(true);
    resolveReleases(ids).then((rs) => {
      if (active) {
        setReleases(rs);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, loadingLists]);

  return (
    <AppShell kind="individual" maxWidth={860}>
      <button type="button" onClick={() => navigate("/saved?tab=watchlists")} className="pp-link-muted" style={{ marginBottom: 14, fontSize: 13.5 }}>
        <ArrowLeft size={15} /> All watchlists
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span style={{ width: 42, height: 42, borderRadius: 11, background: "rgba(59,130,246,0.12)", display: "grid", placeItems: "center" }}>
          <ListChecks size={21} color="var(--blue)" />
        </span>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0" }}>{list?.name ?? "Watchlist"}</h1>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{releases.length} {releases.length === 1 ? "release" : "releases"}</div>
        </div>
      </div>

      {!available ? (
        <div className="pp-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          Sign in to use watchlists.
        </div>
      ) : error ? (
        <div className="pp-card" role="alert" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          <p>{error}</p>
          <button type="button" className="pp-btn pp-btn-outline" onClick={() => void refresh()} style={{ marginTop: 14 }}>Retry</button>
        </div>
      ) : loadingLists || loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13.5, padding: 12 }}>Loading…</div>
      ) : !list ? (
        <div className="pp-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          This watchlist does not exist or is no longer available.
        </div>
      ) : releases.length === 0 ? (
        <div className="pp-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
          This watchlist is empty. Open any release and use “Add to list”.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {releases.map((r) => (
            <div key={r.id} style={{ position: "relative" }}>
              <ReleaseCard release={r} variant="saved" />
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Remove "${r.heading}" from this watchlist?`)) return;
                  const removed = await removeItem(id, r.id);
                  if (removed) setReleases((prev) => prev.filter((x) => x.id !== r.id));
                  else pushToast({ title: "Couldn't remove release", description: "Refresh and try again.", variant: "info" });
                }}
                aria-label="Remove from watchlist"
                style={{ position: "absolute", top: 12, right: 12, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, color: "var(--text-muted)", zIndex: 2 }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
