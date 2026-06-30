import { useState } from "react";
import { Users, UserPlus, ShieldCheck, Check, X, Copy, Clock, Crown } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { useOrg, type OrgRole } from "@/lib/useOrg";
import { useAppStore } from "@/store/useAppStore";

const ROLE_LABEL: Record<OrgRole, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };
const ROLE_DESC: Record<OrgRole, string> = {
  owner: "Full access, approves members",
  admin: "Manage team & publish",
  editor: "Create & publish releases",
  viewer: "Read-only access",
};

function RoleBadge({ role }: { role: OrgRole }) {
  const isOwner = role === "owner";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: "var(--r-pill)",
        background: isOwner ? "rgba(245,158,11,0.14)" : "var(--surface-2)",
        color: isOwner ? "#b45309" : "var(--text-secondary)",
      }}
    >
      {isOwner && <Crown size={12} />}
      {ROLE_LABEL[role]}
    </span>
  );
}

function initials(name: string | null, email: string) {
  const base = name?.trim() || email;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || base[0]?.toUpperCase() || "?";
}

export function InstitutionTeam() {
  const org = useOrg();
  const pushToast = useAppStore((s) => s.pushToast);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("editor");
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!org.available) {
    return (
      <AppShell kind="institution" maxWidth={760}>
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Team management needs a live institution account.</div>
      </AppShell>
    );
  }

  const sendInvite = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !/.+@.+\..+/.test(e)) {
      pushToast({ title: "Enter a valid email", variant: "info" });
      return;
    }
    if (org.seatsLeft <= 0) {
      pushToast({ title: "No seats left", description: "The Institution plan includes 5 seats.", variant: "info" });
      return;
    }
    setSending(true);
    const inv = await org.createInvite(e, inviteRole);
    setSending(false);
    if (inv) {
      setEmail("");
      const link = `${window.location.origin}/join/${inv.token}`;
      setLastLink(link);
      try {
        await navigator.clipboard.writeText(link);
        pushToast({ title: "Invite created — link copied", description: `For ${e}`, variant: "success" });
      } catch {
        pushToast({ title: "Invite created", description: "Copy the link below to share.", variant: "success" });
      }
    } else {
      pushToast({ title: "Couldn't create invite", variant: "info" });
    }
  };

  return (
    <AppShell kind="institution" maxWidth={760}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
          <Users size={22} color="var(--text-secondary)" />
        </span>
        <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em" }}>Team</h1>
      </div>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 22 }}>
        Manage who can act on behalf of your organisation.
      </p>

      {org.status === "pending" && (
        <div className="pp-card" style={{ padding: 16, marginBottom: 18, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", gap: 10, alignItems: "center" }}>
          <Clock size={18} color="#b45309" />
          <span style={{ fontSize: 13.5, color: "var(--text)" }}>
            Your membership is awaiting approval from the organisation owner. You'll get full access once approved.
          </span>
        </div>
      )}

      {/* Owner-only: pending approvals */}
      {org.can.approve && org.pendingMembers.length > 0 && (
        <section className="pp-card" style={{ padding: 20, marginBottom: 18 }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={17} color="var(--blue)" /> Pending approvals
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
            Only you, as owner, can approve members. Approve someone you recognise; decline anyone you don't.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {org.pendingMembers.map((m) => (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                <Disc text={initials(m.full_name, m.email)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.full_name || m.email}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{m.email} · invited as {ROLE_LABEL[m.role]}</div>
                </div>
                <button type="button" onClick={() => org.approve(m.user_id)} className="pp-btn pp-btn-primary" style={{ padding: "6px 12px", fontSize: 13 }}>
                  <Check size={14} /> Approve
                </button>
                <button type="button" onClick={() => org.decline(m.user_id)} className="pp-btn pp-btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>
                  <X size={14} /> Decline
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite (owner/admin) */}
      {org.can.invite && (
        <section className="pp-card" style={{ padding: 20, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <UserPlus size={17} /> Invite a teammate
            </h2>
            <span style={{ fontSize: 12.5, color: org.seatsLeft === 0 ? "var(--amber)" : "var(--text-muted)" }}>
              {org.seatsLeft} of {org.seatLimit} seats left
            </span>
          </div>
          {org.seatsLeft === 0 ? (
            <div style={{ fontSize: 13.5, color: "var(--text-secondary)", padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
              You've used all 5 seats on the Institution plan. Remove or decline a member to free a seat — or see the Enterprise plan (10 seats) under Manage subscription.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input className="pp-input" type="email" placeholder="name@organisation.gov" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
              <select className="pp-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as OrgRole)} style={{ width: 130 }}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="button" onClick={sendInvite} disabled={sending} className="pp-btn pp-btn-primary" style={{ opacity: sending ? 0.7 : 1 }}>
                {sending ? "Creating…" : "Create invite"}
              </button>
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
            The invite is locked to this email address — it can't be used by anyone else. After they sign up and accept, you'll approve them above.
          </p>
          {lastLink && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "9px 12px", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastLink}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(lastLink);
                  pushToast({ title: "Link copied", variant: "success" });
                }}
                className="pp-btn pp-btn-ghost"
                style={{ padding: "5px 10px", fontSize: 12.5 }}
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          )}

          {org.invites.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Pending invites</div>
              {org.invites.map((inv) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                  <Clock size={15} color="var(--text-muted)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{inv.email}</span>
                  <RoleBadge role={inv.role} />
                  <button type="button" onClick={() => org.revokeInvite(inv.id)} aria-label="Revoke invite" style={{ color: "var(--text-muted)", padding: 5 }}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section className="pp-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 700 }}>Members ({org.activeMembers.length})</h2>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{org.seatsUsed} of {org.seatLimit} seats used</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {org.activeMembers.map((m) => {
            const isOwner = m.role === "owner";
            const canEditRole = org.can.approve && !isOwner; // owner-only role management
            return (
              <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: "1px solid var(--border)" }}>
                <Disc text={initials(m.full_name, m.email)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.full_name || m.email}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{m.email} · {ROLE_DESC[m.role]}</div>
                </div>
                {canEditRole ? (
                  <select
                    className="pp-input"
                    value={m.role}
                    onChange={(e) => org.setRole(m.user_id, e.target.value as OrgRole)}
                    style={{ width: 120, padding: "6px 8px", fontSize: 13 }}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <RoleBadge role={m.role} />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function Disc({ text }: { text: string }) {
  return (
    <span style={{ width: 38, height: 38, borderRadius: 999, background: "linear-gradient(135deg,#6366f1,#2563eb)", color: "#fff", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
      {text}
    </span>
  );
}
