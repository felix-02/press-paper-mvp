import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Plus, Search, MoreHorizontal } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { PageHeader } from "@/components/dashboard/Panels";
import { StatusPill, MediaThumb } from "@/components/dashboard/ReleaseBits";
import { TypeBadge } from "@/components/release/ReleaseTypeBadge";
import { TABLE_RELEASES } from "@/data/releases";
import type { Release } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { supabase, type ReleaseRow } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { rowToRelease } from "@/lib/releaseMap";

const COLS = "minmax(0,1fr) 132px 118px 150px 74px 104px 40px";

function HeaderCell({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-faint)", textAlign: right ? "right" : "left" }}>
      {children}
    </div>
  );
}

function Row({ r }: { r: Release }) {
  const dash = (v?: string) => (v && v.length ? v : "—");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COLS,
        gap: 14,
        alignItems: "center",
        padding: "14px 18px",
        borderTop: "1px solid var(--border)",
      }}
    >
      {/* release */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
        <MediaThumb scene={r.scene} w={52} h={38} radius={7} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.heading}
            </span>
            {r.isNew && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", background: "rgba(52,211,153,0.14)", padding: "2px 7px", borderRadius: 999, flexShrink: 0 }}>
                NEW
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.subheading}
          </div>
        </div>
      </div>

      <div><TypeBadge type={r.type} /></div>
      <div><StatusPill status={r.status} /></div>
      <div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{dash(r.publishedDate)}</div>
        {r.publishedTime ? <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 1 }}>{r.publishedTime}</div> : null}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "right" }}>{dash(r.views)}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "right" }}>{dash(r.engagement)}</div>
      <div style={{ textAlign: "right" }}>
        <button type="button" onClick={(e) => e.preventDefault()} style={{ color: "var(--text-muted)", padding: 4 }} aria-label="Row actions">
          <MoreHorizontal size={17} />
        </button>
      </div>
    </div>
  );
}

export function Releases() {
  const published = useAppStore((s) => s.publishedReleases);
  const { configured, user } = useAuth();
  const [live, setLive] = useState<Release[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  // LIVE: load this institution's own releases (all statuses) from Postgres.
  useEffect(() => {
    if (!configured || !supabase || !user) return;
    let active = true;
    supabase
      .from("releases")
      .select("*")
      .eq("owner", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) setLive((data as ReleaseRow[]).map(rowToRelease));
      });
    return () => {
      active = false;
    };
  }, [configured, user]);

  // In LIVE mode the DB rows are the source of truth (above the demo baseline);
  // in DEMO mode the session-published rows sit above the baseline.
  const allRows = configured ? [...live, ...TABLE_RELEASES] : [...published, ...TABLE_RELEASES];

  const rows = allRows.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || r.heading.toLowerCase().includes(q) || (r.subheading ?? "").toLowerCase().includes(q);
    const matchesType = typeFilter === "All types" || r.type === typeFilter;
    const matchesStatus = statusFilter === "All statuses" || r.status === statusFilter;
    return matchesQuery && matchesType && matchesStatus;
  });

  const selectStyle: React.CSSProperties = {
    fontWeight: 500,
    fontSize: 13.5,
    color: "var(--text-secondary)",
    background: "var(--surface-1)",
    border: "1px solid var(--border)",
    borderRadius: "var(--r-md)",
    padding: "9px 32px 9px 14px",
    appearance: "none",
    cursor: "pointer",
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
  };

  return (
    <AppShell kind="institution">
      <PageHeader
        title="Releases"
        subtitle="Manage everything you've published, scheduled or drafted."
        actions={
          <Link to="/inst/publish" className="pp-btn pp-btn-primary">
            <Plus size={16} /> New Release
          </Link>
        }
      />

      {/* toolbar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            padding: "9px 14px",
            color: "var(--text-faint)",
            flex: 1,
            maxWidth: 360,
          }}
        >
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search releases…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13.5 }}
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
          {["All types", "Announcement", "Publication", "Consultation", "Statistics & Research"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          {["All statuses", "Published", "Draft", "Scheduled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* table */}
      <div className="pp-card" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 14, padding: "13px 18px", background: "var(--surface-2)" }}>
          <HeaderCell>Release</HeaderCell>
          <HeaderCell>Type</HeaderCell>
          <HeaderCell>Status</HeaderCell>
          <HeaderCell>Date</HeaderCell>
          <HeaderCell right>Views</HeaderCell>
          <HeaderCell right>Engmt.</HeaderCell>
          <HeaderCell right> </HeaderCell>
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
            No releases match your search.
          </div>
        ) : (
          rows.map((r) => <Row key={r.id} r={r} />)
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 12.5, color: "var(--text-muted)" }}>
        <span>Showing {rows.length} {rows.length === 1 ? "release" : "releases"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={(e) => e.preventDefault()} className="pp-btn pp-btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }}>Previous</button>
          <button type="button" onClick={(e) => e.preventDefault()} className="pp-btn pp-btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }}>Next</button>
        </div>
      </div>
    </AppShell>
  );
}
