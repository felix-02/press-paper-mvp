import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Search, FileText, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { Avatar } from "@/components/brand/Avatar";
import { Verified } from "@/components/primitives/Bits";
import { inst } from "@/data/institutions";
import { useAuth } from "@/auth/AuthProvider";
import { useSearch } from "@/lib/useSearch";
import { useNotifications } from "@/lib/useNotifications";

export function TopBar({ kind }: { kind: "institution" | "individual" }) {
  const wg = inst("welsh-government");
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const orgName = profile?.institution_name || wg.name;
  const personName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "You";

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const results = useSearch(query);
  const notifications = useNotifications();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Unread tracking: a notification is unread if it's newer than the last time
  // the user opened-then-closed the notifications popup (persisted locally).
  const LAST_SEEN_KEY = "pp_notif_last_seen";
  const [lastSeen, setLastSeen] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
    } catch {
      return 0;
    }
  });
  const hasUnread = notifications.some((n) => n.ts > lastSeen);
  const wasNotifOpen = useRef(false);
  useEffect(() => {
    // When the popup transitions open -> closed, mark everything seen.
    if (wasNotifOpen.current && !notifOpen) {
      const now = Date.now();
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(now));
      } catch {
        /* ignore */
      }
      setLastSeen(now);
    }
    wasNotifOpen.current = notifOpen;
  }, [notifOpen]);

  // close menus on outside click / escape
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (to: string) => {
    setSearchOpen(false);
    setNotifOpen(false);
    setQuery("");
    navigate(to);
  };

  return (
    <header
      ref={wrapRef}
      style={{
        height: "var(--topbar-h)",
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
        flexShrink: 0,
        position: "relative",
        zIndex: 30,
      }}
    >
      <div style={{ width: "var(--sidebar-w)", paddingLeft: 22, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Logo size={19} to={kind === "institution" ? "/inst" : "/home"} />
      </div>

      {/* search */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "0 24px", position: "relative" }}>
        <div style={{ width: "100%", maxWidth: 540, position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--surface-2)",
              border: `1px solid ${searchOpen ? "var(--blue)" : "var(--border)"}`,
              borderRadius: "var(--r-pill)",
              padding: "9px 16px",
              color: "var(--text-faint)",
            }}
          >
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
                setNotifOpen(false);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search institutions, topics or issues…"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: 13.5 }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear" style={{ color: "var(--text-muted)", display: "grid", placeItems: "center" }}>
                <X size={15} />
              </button>
            )}
          </div>

          {searchOpen && query.trim() && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
                boxShadow: "var(--shadow-lg)",
                padding: 8,
                maxHeight: 440,
                overflowY: "auto",
                zIndex: 40,
              }}
            >
              {results.empty ? (
                <div style={{ padding: "20px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
                  No results for “{query}”.
                </div>
              ) : (
                <>
                  {results.institutions.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 10px 4px" }}>
                      Institutions
                    </div>
                  )}
                  {results.institutions.map((i) => (
                    <button
                      key={i.slug}
                      type="button"
                      onClick={() => go(`/institution/${i.slug}`)}
                      style={rowStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <InstitutionMark institution={i} size={30} />
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 600 }}>
                          {i.name} {i.verified && <Verified size={11} />}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{i.category}</span>
                      </span>
                    </button>
                  ))}

                  {results.releases.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 10px 4px" }}>
                      Releases
                    </div>
                  )}
                  {results.releases.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => go(`/release/${r.id}`)}
                      style={rowStyle}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-3)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <FileText size={15} color="var(--text-muted)" />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 420 }}>{r.heading}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{inst(r.institutionSlug).name} · {r.type}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingRight: 22, flexShrink: 0, position: "relative" }}>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((v) => !v);
              setSearchOpen(false);
            }}
            style={{
              position: "relative",
              width: 38,
              height: 38,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              color: "var(--text-secondary)",
              border: `1px solid ${notifOpen ? "var(--blue)" : "var(--border)"}`,
              background: "var(--surface-1)",
            }}
          >
            <Bell size={17} />
            {hasUnread && (
              <span style={{ position: "absolute", top: 9, right: 10, width: 7, height: 7, borderRadius: 999, background: "var(--blue)", border: "1.5px solid var(--bg)" }} />
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: 360,
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
                zIndex: 40,
              }}
            >
              <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700 }}>Notifications</div>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>
                    You're all caught up. Follow institutions to get notified of new releases.
                  </div>
                ) : (
                  notifications.map((n) => {
                    const i = inst(n.slug);
                    const unread = n.ts > lastSeen;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => go(`/release/${n.id}`)}
                        style={{
                          display: "flex",
                          gap: 11,
                          alignItems: "flex-start",
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border)",
                          borderLeft: `3px solid ${unread ? "var(--blue)" : "transparent"}`,
                          background: unread ? "rgba(59,130,246,0.05)" : "transparent",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = unread ? "rgba(59,130,246,0.05)" : "transparent")}
                      >
                        <InstitutionMark institution={i} size={32} />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            <strong style={{ color: "var(--text)" }}>{i.name}</strong> published a new {n.type.toLowerCase()}
                          </span>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.heading}</span>
                          <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>{n.time}</span>
                        </span>
                        {unread && <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--blue)", flexShrink: 0, marginTop: 5 }} />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {kind === "institution" ? (
          <Link to="/inst/profile" style={pillStyle}>
            <InstitutionMark institution={wg} size={28} />
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 500 }}>
              {orgName}
              <Verified size={13} />
            </span>
            <ChevronDown size={15} color="var(--text-muted)" />
          </Link>
        ) : (
          <Link to="/me" style={pillStyle}>
            <Avatar size={28} name={personName} />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{personName}</span>
            <ChevronDown size={15} color="var(--text-muted)" />
          </Link>
        )}
      </div>
    </header>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  width: "100%",
  textAlign: "left",
  padding: "9px 10px",
  borderRadius: "var(--r-md)",
  background: "transparent",
};

const pillStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "4px 10px 4px 4px",
  borderRadius: "var(--r-pill)",
  border: "1px solid var(--border)",
  background: "var(--surface-1)",
};
