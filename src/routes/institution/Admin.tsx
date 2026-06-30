import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Check, X, Clock, Building2, Send, Copy } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { useAuth } from "@/auth/AuthProvider";
import { useAppStore } from "@/store/useAppStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface PendingInstitution {
  user_id: string;
  institution_name: string | null;
  institution_slug: string | null;
  email: string;
  domain: string | null;
  created_at: string;
  status: string;
}

interface PlatformInvite {
  id: string;
  email: string;
  org_name: string;
  org_slug: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", fg: "#b45309", label: "Pending" },
  verified: { bg: "rgba(16,185,129,0.12)", fg: "#047857", label: "Approved" },
  rejected: { bg: "rgba(239,68,68,0.12)", fg: "#dc2626", label: "Rejected" },
  unverified: { bg: "var(--surface-2)", fg: "var(--text-muted)", label: "Unverified" },
};

export function AdminReview() {
  const { profile } = useAuth();
  const pushToast = useAppStore((s) => s.pushToast);
  const [rows, setRows] = useState<PendingInstitution[]>([]);
  const [invites, setInvites] = useState<PlatformInvite[]>([]);
  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = !!profile?.is_admin;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [inst, inv] = await Promise.all([
      supabase.rpc("pending_institutions"),
      supabase.rpc("platform_invites_list"),
    ]);
    setRows((inst.data as PendingInstitution[] | null) ?? []);
    setInvites((inv.data as PlatformInvite[] | null) ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const issueInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    const name = orgName.trim();
    if (!name || !/.+@.+\..+/.test(email)) {
      pushToast({ title: "Enter the organisation name and a valid official email", variant: "info" });
      return;
    }
    if (!supabase) return;
    setIssuing(true);
    const { data } = await supabase.rpc("create_platform_invite", { p_email: email, p_org_name: name });
    setIssuing(false);
    const token = data as string | null;
    if (token) {
      const link = `${window.location.origin}/institution-invite/${token}`;
      setLastLink(link);
      setOrgName("");
      setInviteEmail("");
      try {
        await navigator.clipboard.writeText(link);
        pushToast({ title: "Invite created — link copied", description: `Send it to ${email}`, variant: "success" });
      } catch {
        pushToast({ title: "Invite created", description: "Copy the link below.", variant: "success" });
      }
      await load();
    } else {
      pushToast({ title: "Couldn't create invite", variant: "info" });
    }
  };

  const revokeInvite = async (id: string) => {
    if (!supabase) return;
    await supabase.rpc("revoke_platform_invite", { p_id: id });
    await load();
  };

  const act = async (target: string, approve: boolean) => {
    if (!supabase) return;
    const { data } = await supabase.rpc(approve ? "approve_institution" : "reject_institution", { target });
    if (String(data) === "ok") {
      pushToast({ title: approve ? "Institution approved" : "Institution rejected", variant: approve ? "success" : "info" });
      await load();
    } else {
      pushToast({ title: "Action failed", description: String(data), variant: "info" });
    }
  };

  if (!isAdmin) {
    return (
      <AppShell kind="institution" maxWidth={720}>
        <div className="pp-card" style={{ padding: 40, textAlign: "center" }}>
          <ShieldCheck size={30} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Admins only</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>This review queue is only available to Presspaper platform administrators.</p>
        </div>
      </AppShell>
    );
  }

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <AppShell kind="institution" maxWidth={860}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
          <ShieldCheck size={22} color="var(--blue)" />
        </span>
        <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em" }}>Institution review</h1>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 22 }}>
        Institution accounts are invite-only. Issue an invite to an organisation's official email, then approve them once they've accepted.
      </p>

      {/* Issue an institution invite */}
      <section className="pp-card" style={{ padding: 20, marginBottom: 18 }}>
        <h2 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Send size={16} /> Invite an institution
        </h2>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
          Send the generated link to the org's <strong>official</strong> email — only someone who controls that inbox can accept, and the link works once.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="pp-input" placeholder="Organisation name (e.g. BBC)" value={orgName} onChange={(e) => setOrgName(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          <input className="pp-input" type="email" placeholder="press@bbc.co.uk" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <button type="button" onClick={issueInvite} disabled={issuing} className="pp-btn pp-btn-primary" style={{ opacity: issuing ? 0.7 : 1 }}>
            {issuing ? "Creating…" : "Create invite"}
          </button>
        </div>
        {lastLink && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "9px 12px", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
            <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastLink}</span>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(lastLink); pushToast({ title: "Copied", variant: "success" }); }} className="pp-btn pp-btn-ghost" style={{ padding: "5px 10px", fontSize: 12.5 }}>
              <Copy size={13} /> Copy
            </button>
          </div>
        )}
        {invites.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Issued invites</div>
            {invites.map((inv) => {
              const consumed = !!inv.consumed_at;
              const expired = !consumed && new Date(inv.expires_at) <= new Date();
              const label = consumed ? "Accepted" : expired ? "Expired" : "Pending";
              const color = consumed ? "#047857" : expired ? "var(--text-muted)" : "#b45309";
              return (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{inv.org_name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{inv.email}</div>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color, padding: "3px 9px", borderRadius: 999, background: "var(--surface-2)" }}>{label}</span>
                  {!consumed && (
                    <button type="button" onClick={() => revokeInvite(inv.id)} aria-label="Revoke" style={{ color: "var(--text-muted)", padding: 5 }}>
                      <X size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {loading ? (
        <div className="pp-card" style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="pp-card" style={{ padding: 20, marginBottom: 18 }}>
              <h2 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color="var(--amber)" /> Awaiting approval ({pending.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
                {pending.map((r) => (
                  <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: "1px solid var(--border)" }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--surface-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Building2 size={18} color="var(--text-secondary)" />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.institution_name || r.institution_slug || "Unnamed"}</div>
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                        {r.email}{r.domain ? ` · domain: ${r.domain}` : ""}
                      </div>
                    </div>
                    <button type="button" onClick={() => act(r.user_id, true)} className="pp-btn pp-btn-primary" style={{ padding: "6px 12px", fontSize: 13 }}>
                      <Check size={14} /> Approve
                    </button>
                    <button type="button" onClick={() => act(r.user_id, false)} className="pp-btn pp-btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>
                      <X size={14} /> Reject
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="pp-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 8 }}>All institutions ({rows.length})</h2>
            {rows.length === 0 ? (
              <div style={{ fontSize: 13.5, color: "var(--text-muted)", padding: "10px 0" }}>No institution accounts yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {rows.map((r) => {
                  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.unverified;
                  return (
                    <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--border)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{r.institution_name || r.institution_slug || "Unnamed"}</div>
                        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{r.email}{r.domain ? ` · ${r.domain}` : ""}</div>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: s.fg, background: s.bg, padding: "3px 10px", borderRadius: 999 }}>{s.label}</span>
                      {r.status !== "verified" && (
                        <button type="button" onClick={() => act(r.user_id, true)} className="pp-btn pp-btn-ghost" style={{ padding: "5px 10px", fontSize: 12.5 }}>Approve</button>
                      )}
                      {r.status !== "rejected" && (
                        <button type="button" onClick={() => act(r.user_id, false)} className="pp-btn pp-btn-ghost" style={{ padding: "5px 10px", fontSize: 12.5 }}>Reject</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
