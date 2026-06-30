import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, MapPin, ShieldCheck, Pencil, UserPlus, Check, X } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { PageHeader, Panel } from "@/components/dashboard/Panels";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { Avatar } from "@/components/brand/Avatar";
import { Verified } from "@/components/primitives/Bits";
import { inst } from "@/data/institutions";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/auth/AuthProvider";
import { useOrg } from "@/lib/useOrg";
import { supabase } from "@/lib/supabase";

function ReadField({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <label style={{ display: "block", gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</span>
      <input className="pp-input" value={value} readOnly style={{ color: "var(--text-secondary)", background: "var(--surface-2)", cursor: "default" }} />
    </label>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--text-secondary)" }}>
      <span style={{ width: 18, height: 18, borderRadius: 999, background: "rgba(52,211,153,0.14)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Check size={11} color="var(--green)" strokeWidth={3} />
      </span>
      {label}
    </div>
  );
}

function VerifiedBlock({ domain, since }: { domain?: string | null; since?: string | null }) {
  const sinceLabel = since ? new Date(since).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "today";
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 4px 4px" }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: "rgba(59,130,246,0.12)", display: "grid", placeItems: "center" }}>
          <ShieldCheck size={28} className="pp-verified" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
          <span style={{ fontSize: 15.5, fontWeight: 700 }}>Verified Institution</span>
          <Verified size={15} />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 8 }}>
          Verified as an official public institution. Verified {sinceLabel}.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <CheckRow label="Identity confirmed" />
        <CheckRow label={`Domain verified${domain ? ` (${domain})` : ""}`} />
        <CheckRow label="Official contact on file" />
      </div>
    </>
  );
}

function VerificationPanel() {
  const { configured, profile } = useAuth();
  const status = profile?.verification_status ?? "unverified";
  const storedDomain = profile?.verification_domain ?? "";

  // Demo mode (no backend): keep the showcase verified card.
  if (!configured) return <VerifiedBlock domain="gov.wales" since="2021-01-01" />;

  if (status === "verified") return <VerifiedBlock domain={storedDomain} since={profile?.verified_at} />;

  if (status === "rejected") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "rgba(239,68,68,0.12)", padding: "3px 9px", borderRadius: 999 }}>NOT APPROVED</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          This institution account wasn't approved. If you believe this is a mistake, contact support from your organisation's official email and we'll review it again.
        </p>
      </div>
    );
  }

  // pending / unverified — awaiting admin review (no DNS, no setup).
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <ShieldCheck size={18} color="var(--amber)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--amber)", background: "rgba(245,158,11,0.12)", padding: "3px 9px", borderRadius: 999 }}>PENDING REVIEW</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {storedDomain ? (
          <>We've recorded your organisation domain <strong style={{ color: "var(--text)" }}>{storedDomain}</strong>. A Presspaper reviewer will approve your account shortly.</>
        ) : (
          <>Your institution account is awaiting review by a Presspaper reviewer.</>
        )}
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 8 }}>
        Once approved you'll get the verified badge and can publish. Verification is based on your work-email domain — no DNS setup needed.
      </p>
    </div>
  );
}

function initialsFrom(name: string | null, email: string): string {
  const base = name?.trim() || email;
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || base[0]?.toUpperCase() || "?";
}

function PlansModal({ seatsUsed, onClose }: { seatsUsed: number; onClose: () => void }) {
  const plans = [
    { name: "Institution", price: "Current plan", seats: 5, current: true, features: ["5 team seats", "Verified institution badge", "Unlimited releases", "AI summaries & translation", "Analytics dashboard"] },
    { name: "Enterprise", price: "Coming soon", seats: 10, current: false, features: ["10 team seats", "Everything in Institution", "Priority support", "SSO & advanced controls", "Custom data retention"] },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 100, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="pp-card" style={{ width: "100%", maxWidth: 720, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Manage subscription</h3>
          <button type="button" onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {plans.map((p) => (
            <div key={p.name} style={{ border: `1.5px solid ${p.current ? "var(--blue)" : "var(--border)"}`, borderRadius: "var(--r-lg)", padding: 18, position: "relative", opacity: p.current ? 1 : 0.9 }}>
              {p.current && (
                <span style={{ position: "absolute", top: 14, right: 14, fontSize: 11, fontWeight: 700, color: "var(--blue)", background: "rgba(59,130,246,0.1)", padding: "3px 9px", borderRadius: 999 }}>CURRENT</span>
              )}
              <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: p.current ? "var(--text-secondary)" : "var(--amber)", fontWeight: p.current ? 400 : 600, marginTop: 2 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10, marginBottom: 12 }}>{p.current ? `${seatsUsed} of ${p.seats} seats used` : `${p.seats} seats`}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--text-secondary)" }}>
                    <Check size={15} color={p.current ? "var(--green)" : "var(--text-muted)"} style={{ flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button type="button" disabled className={p.current ? "pp-btn pp-btn-outline" : "pp-btn pp-btn-primary"} style={{ width: "100%", marginTop: 16, opacity: 0.7, cursor: "default" }}>
                {p.current ? "Your plan" : "Coming soon"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Profile() {
  const i = inst("welsh-government");
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();
  const { configured, user, profile } = useAuth();
  const org = useOrg();
  const location = profile?.org_location || i.location || "—";
  const website = profile?.org_website || i.website || "—";
  const category = profile?.org_category || i.category;

  const displayName = profile?.institution_name || i.name;
  const vstatus = configured ? profile?.verification_status ?? "unverified" : "verified";
  const [orgName, setOrgName] = useState(displayName);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  // Initialise the editable fields from the loaded profile (registration data).
  useEffect(() => {
    if (profile) {
      setOrgName(profile.institution_name || i.name);
      setBio(profile.org_description || (profile as { bio?: string }).bio || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const saveProfile = async () => {
    if (configured && supabase && user) {
      setSaving(true);
      const { error } = await supabase.from("profiles").update({ institution_name: orgName, org_description: bio, bio }).eq("id", user.id);
      setSaving(false);
      if (error) {
        pushToast({ title: "Couldn't save", description: error.message, variant: "info" });
        return;
      }
    }
    pushToast({ title: "Profile updated", description: "Your organisation details have been saved.", variant: "success" });
  };

  return (
    <AppShell kind="institution" maxWidth={1180}>
      <PageHeader title="Organisation Profile" subtitle={`Manage how ${displayName} appears on Presspaper.`} />

      {/* header card */}
      <div className="pp-card" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: 110, background: `linear-gradient(125deg, ${i.color} 0%, ${i.color2 ?? i.color} 100%)`, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
        </div>
        <div style={{ padding: "0 24px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -34 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              <div style={{ borderRadius: 18, border: "4px solid var(--surface-1)", lineHeight: 0 }}>
                <InstitutionMark institution={i} size={80} shape="square" />
              </div>
              <div style={{ paddingBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{displayName}</h2>
                  {vstatus === "verified" ? (
                    <Verified size={16} />
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: vstatus === "pending" ? "var(--amber)" : "var(--text-muted)",
                        background: vstatus === "pending" ? "rgba(245,158,11,0.12)" : "var(--surface-2)",
                        border: "1px solid var(--border)",
                        padding: "2px 9px",
                        borderRadius: 999,
                      }}
                    >
                      {vstatus === "pending" ? "Pending" : "Unverified"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 2 }}>{i.subName}</div>
              </div>
            </div>
            <button type="button" onClick={(e) => e.preventDefault()} className="pp-btn pp-btn-outline" style={{ marginBottom: 4 }}>
              <Pencil size={14} /> Edit Profile
            </button>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 13, color: "var(--text-muted)", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{category}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> {location}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--blue)" }}><Globe size={14} /> {website}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, alignItems: "start" }}>
        {/* left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel title="Organisation details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Organisation name</span>
                <input className="pp-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </label>
              <ReadField label="Welsh name" value={i.subName ?? ""} />
              <ReadField label="Category" value={category} />
              <ReadField label="Location (HQ)" value={location} />
              <ReadField label="Website" value={website} full />
              <label style={{ display: "block", gridColumn: "1 / -1" }}>
                <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Description</span>
                <textarea
                  className="pp-input"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{ resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={(e) => e.preventDefault()} className="pp-btn pp-btn-ghost">Cancel</button>
              <button
                type="button"
                className="pp-btn pp-btn-primary"
                onClick={saveProfile}
                disabled={saving}
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </Panel>

          <Panel
            title="Authorised People"
            action={
              org.can.invite ? (
                <button type="button" onClick={() => navigate("/inst/team")} className="pp-btn pp-btn-outline" style={{ padding: "6px 13px", fontSize: 13 }}>
                  <UserPlus size={14} /> Invite
                </button>
              ) : undefined
            }
            bodyStyle={{ padding: 0 }}
          >
            {!org.available ? (
              <div style={{ padding: 18, fontSize: 13.5, color: "var(--text-muted)" }}>Team members appear here once you're on a live account.</div>
            ) : org.activeMembers.length === 0 ? (
              <div style={{ padding: 18, fontSize: 13.5, color: "var(--text-muted)" }}>No active members yet.</div>
            ) : (
              org.activeMembers.map((p, idx) => (
                <div
                  key={p.user_id}
                  style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 18px", borderTop: idx === 0 ? "none" : "1px solid var(--border)" }}
                >
                  <Avatar initials={initialsFrom(p.full_name, p.email)} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.full_name || p.email}</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{p.email}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: p.role === "owner" ? "#b45309" : "var(--text-secondary)", background: "var(--surface-3)", padding: "3px 10px", borderRadius: 999, textTransform: "capitalize" }}>
                    {p.role}
                  </span>
                </div>
              ))
            )}
            {org.available && (
              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)" }}>
                <button type="button" onClick={() => navigate("/inst/team")} className="pp-link-muted" style={{ fontSize: 13 }}>
                  Manage team & roles →
                </button>
              </div>
            )}
          </Panel>
        </div>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel title="Verification">
            <VerificationPanel />
          </Panel>

          <Panel title="Publishing Access">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["Plan", "Institution"],
                ["Team seats", `${org.activeMembers.length} of 5 used`],
                ["Verification", vstatus === "verified" ? "Verified" : "Not verified"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShowPlans(true)} className="pp-btn pp-btn-ghost" style={{ width: "100%", marginTop: 16 }}>
              Manage subscription
            </button>
          </Panel>
        </div>
      </div>
      {showPlans && <PlansModal seatsUsed={org.activeMembers.length} onClose={() => setShowPlans(false)} />}
    </AppShell>
  );
}
