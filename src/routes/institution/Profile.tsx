import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ExternalLink, Globe, Info, Lock, MapPin, Pencil, Tag, Upload, UserPlus } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { Panel } from "@/components/dashboard/Panels";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { Avatar } from "@/components/brand/Avatar";
import { InlineSpinner, Verified } from "@/components/primitives/Bits";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/auth/AuthProvider";
import { ORG_ROLE_LABEL, useOrg } from "@/lib/useOrg";
import { supabase } from "@/lib/supabase";
import { externalUrlLabel, safeExternalUrl } from "@/lib/externalUrl";
import { usePageTitle } from "@/lib/usePageTitle";
import type { PublicInstitutionRow } from "@/lib/usePublicInstitutions";
import type { Institution } from "@/types";

const DETAIL_FIELDS = [
  { key: "location", label: "Headquarters", maxLength: 300 },
  { key: "website", label: "Website", maxLength: 500 },
  { key: "description", label: "Description", maxLength: 5000 },
] as const;

type EditableOrganisationDetails = Record<(typeof DETAIL_FIELDS)[number]["key"], string>;

const VERIFICATION_BENEFITS = [
  "Publish official releases to the public",
  "Show the verified badge on your profile and on every release",
  "Reach people through smart alerts based on what matters to them",
];

interface VerificationDetails {
  verification_domain?: string | null;
  verified_at?: string | null;
}

const verificationDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

function DetailRows({ rows, className }: { rows: [string, ReactNode][]; className: string }) {
  return (
    <dl className={className}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Verification({ status, since, domain }: { status: string; since?: string | null; domain?: string | null }) {
  const verified = status === "verified";
  const timestamp = since ? Date.parse(since) : NaN;
  const verifiedSince = Number.isFinite(timestamp) ? verificationDateFormat.format(timestamp) : null;
  const nextReview = verifiedSince ? new Date(timestamp) : null;
  if (nextReview) {
    const month = nextReview.getUTCMonth();
    nextReview.setUTCFullYear(nextReview.getUTCFullYear() + 1);
    if (nextReview.getUTCMonth() !== month) nextReview.setUTCDate(0);
  }
  const inviteBenefit = domain
    ? `Invite team members who use an @${domain} email address`
    : "Invite team members who use an official organisation email address";
  const statusLabel = verified ? "Verified" : status === "rejected" ? "Not approved" : "Pending review";
  return (
    <Panel
      title="Verification"
      style={{ gridArea: "verification" }}
      action={
        <span className="pp-org-profile-status" data-status={status}>
          {verified && <Verified size={13} label="" />}
          {statusLabel}
        </span>
      }
    >
      {verified ? (
        <>
          <DetailRows className="pp-org-profile-metadata" rows={[
            ["Verified Since", verifiedSince],
            ["Verified Domain", domain],
            ["Next Review", nextReview && <time dateTime={nextReview.toISOString().slice(0, 10)} title="One year after verification">
              {verificationDateFormat.format(nextReview)}
            </time>],
          ]} />
          <div className="pp-org-profile-benefits">
            <h3>What verification allows</h3>
            <ul>
              {[...VERIFICATION_BENEFITS, inviteBenefit].map((label) => (
                <li key={label}><Check size={14} aria-hidden="true" />{label}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="pp-org-profile-note">
          {status === "rejected"
            ? "Contact Presspaper from your organisation’s official email to request another review."
            : "A Presspaper reviewer will verify your institution using its work-email domain."}
        </p>
      )}
      <div className="pp-org-profile-callout">
        <Info size={14} aria-hidden="true" />
        <span>
          {verified
            ? "Changes to your organisation name, category or domain are reviewed by Presspaper before they appear publicly. Your badge stays active during the review"
            : "Presspaper reviews requests to change your organisation name or verified domain."}
        </span>
      </div>
      <Link to="/contact" className="pp-link-muted pp-org-profile-request">
        Request a Change <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </Panel>
  );
}

export function Profile() {
  usePageTitle("Organisation profile");
  const pushToast = useAppStore((s) => s.pushToast);
  const { user, profile, profileReady, profileError, refreshProfile } = useAuth();
  const org = useOrg();
  const { slug, role, active, verified } = org;
  const canEditProfile = active && role === "owner";
  const [publicDetails, setPublicDetails] = useState<PublicInstitutionRow | null>(null);
  const [teamVerification, setTeamVerification] = useState<{ slug: string; details: VerificationDetails | null } | null>(null);
  const [draft, setDraft] = useState<EditableOrganisationDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase || !slug || !active || role === "owner") return;
    let current = true;
    const client = supabase;
    void client.rpc("public_institution", { p_slug: slug }).then(({ data }) => {
      if (current) setPublicDetails((data as PublicInstitutionRow[] | null)?.[0] ?? null);
    });
    void client.rpc("org_verification_details", { p_slug: slug }).then(({ data }) => {
      if (current) setTeamVerification({ slug, details: (data as VerificationDetails[] | null)?.[0] ?? null });
    });
    return () => { current = false; };
  }, [slug, role, active]);

  // Team members see the organisation's public details, which live on the owner profile.
  const publicOrg = role !== "owner" && publicDetails?.slug === slug ? publicDetails : null;
  const displayName = publicOrg?.name || profile?.institution_name?.trim() || "Your organisation";
  const category = (publicOrg ? publicOrg.category : profile?.org_category)?.trim();
  const details: EditableOrganisationDetails = publicOrg ? {
    location: publicOrg.location?.trim() || "",
    website: publicOrg.website?.trim() || "",
    description: publicOrg.description?.trim() || "",
  } : {
    location: profile?.org_location?.trim() || "",
    website: profile?.org_website?.trim() || "",
    description: profile?.org_description?.trim() || (canEditProfile ? profile?.bio?.trim() : "") || "",
  };
  const website = safeExternalUrl(details.website);
  const activeTeamVerification = active && teamVerification?.slug === slug ? teamVerification.details : null;
  const verification = canEditProfile ? profile : activeTeamVerification;
  const status = verified ? "verified" : (canEditProfile ? profile?.verification_status : null) ?? "unverified";
  const institution: Institution = {
    slug: slug ?? "institution",
    name: displayName,
    category: category || "Institution",
    verified: status === "verified",
    color: "#606060",
    color2: "#454545",
    mark: "generic",
    avatarUrl: org.avatarUrl || publicOrg?.avatar_url || undefined,
  };
  const busy = saving || uploadingLogo;

  const uploadLogo = async (file: File) => {
    if (!supabase || !user || !slug || !canEditProfile || busy) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || !file.size || file.size > 2 * 1024 * 1024) {
      pushToast({ title: "Use a square PNG, JPEG or WebP up to 2 MB", variant: "info" });
      return;
    }

    setUploadingLogo(true);
    try {
      const path = `${slug}/logo-${Date.now()}.${file.type.split("/")[1]}`;
      const storage = supabase.storage.from("org-media");
      const { error: uploadError } = await storage.upload(path, file, { cacheControl: "31536000" });
      if (uploadError) {
        pushToast({ title: "Couldn't upload the logo", description: uploadError.message, variant: "error" });
        return;
      }
      const { data: { publicUrl } } = storage.getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id).select("id").single();
      if (error) {
        pushToast({ title: "Couldn't save the logo", variant: "error" });
        return;
      }
      await refreshProfile();
      pushToast({ title: "Logo updated", description: "Readers now see it across the platform.", variant: "success" });
    } catch {
      pushToast({ title: "Couldn't update the logo", variant: "error" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || busy || !canEditProfile || !supabase || !user) return;
    const website = safeExternalUrl(draft.website);
    if (draft.website.trim() && !website) {
      pushToast({ title: "Enter a valid website address", variant: "info" });
      return;
    }
    const description = draft.description.trim();
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        org_description: description,
        bio: description,
        org_website: website,
        org_location: draft.location.trim() || null,
      }).eq("id", user.id).select("id").single();
      if (error) {
        pushToast({ title: "Couldn't save the profile", description: "Review the details and try again.", variant: "error" });
        return;
      }
      setDraft(null);
      await refreshProfile();
      pushToast({ title: "Profile updated", description: "Your organisation details have been saved.", variant: "success" });
    } catch {
      pushToast({ title: "Couldn't save the profile", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!profileReady || profileError || !profile) {
    const unavailable = profileReady && (profileError || !profile);
    return (
      <AppShell kind="institution" maxWidth={1180}>
        <div className="pp-card pp-org-profile-empty" role={unavailable ? "alert" : "status"}>
          {unavailable ? profileError ?? "Organisation profile data is unavailable." : "Loading organisation profile…"}
        </div>
      </AppShell>
    );
  }

  const workspaceStatus = org.loading ? "Loading…" : org.error ? "Unavailable" : null;
  const verifiedChip = institution.verified && (
    <span className="pp-org-profile-verified-chip"><Lock size={11} aria-hidden="true" /> Verified</span>
  );
  const lockedFields = [
    { id: "organisation-name", label: "Organisation Name", value: displayName },
    { id: "organisation-category", label: "Category", value: category ?? "" },
  ];
  const lockedRows: [string, ReactNode][] = lockedFields.map(({ label, value }) => [
    label,
    value && <span className="pp-org-profile-verified-name">{value}{verifiedChip}</span>,
  ]);
  return (
    <AppShell kind="institution" maxWidth={1180}>
      <div className="pp-org-profile">
        <header className="pp-org-profile-heading">
          <div>
            <h1>Organisation Profile</h1>
            <p>Manage how your organisation appears to the public.</p>
          </div>
          {slug && verified && (
            <Link to={`/institution/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" className="pp-link-muted">
              View Public Profile <ExternalLink size={14} aria-hidden="true" />
            </Link>
          )}
        </header>

        <section className="pp-card pp-org-profile-summary" aria-label="Organisation identity">
          <InstitutionMark institution={institution} size={86} shape="square" />
          <div className="pp-org-profile-identity">
            <div className="pp-org-profile-name">
              <h2>{displayName}</h2>
              {institution.verified && <Verified size={19} />}
            </div>
            <div className="pp-org-profile-facts">
              {category && <span><Tag size={14} aria-hidden="true" />{category}</span>}
              {details.location && <span><MapPin size={14} aria-hidden="true" />{details.location}</span>}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer">
                  <Globe size={14} aria-hidden="true" />{externalUrlLabel(website)}
                </a>
              )}
            </div>
            {canEditProfile && (
              <div className="pp-org-profile-logo-action">
                <button
                  type="button"
                  className="pp-btn pp-btn-outline pp-org-profile-action"
                  disabled={busy || draft !== null}
                  aria-busy={uploadingLogo}
                  onClick={() => logoInput.current?.click()}
                >
                  {uploadingLogo ? <InlineSpinner /> : <Upload size={14} aria-hidden="true" />}
                  {uploadingLogo ? "Uploading…" : "Update Logo"}
                </button>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void uploadLogo(file);
                  }}
                />
              </div>
            )}
          </div>
        </section>

        <div className="pp-org-profile-grid">
          <Panel
            title="Organisation Details"
            style={{ gridArea: "details" }}
            bodyStyle={draft ? undefined : { padding: "6px 20px" }}
            action={canEditProfile && !draft ? (
              <button type="button" className="pp-btn pp-btn-outline pp-org-profile-action" disabled={busy} onClick={() => setDraft(details)}>
                <Pencil size={14} aria-hidden="true" /> Edit
              </button>
            ) : undefined}
          >
            {canEditProfile && draft ? (
              <form className="pp-org-profile-form" onSubmit={saveProfile}>
                {lockedFields.map(({ id, label, value }) => (
                  <div key={id} className="pp-org-profile-locked-field">
                    <div className="pp-org-profile-verified-name">
                      <label htmlFor={id}>{label}</label>
                      {value && verifiedChip}
                    </div>
                    <input id={id} className="pp-input" value={value} placeholder="—" disabled />
                  </div>
                ))}
                {DETAIL_FIELDS.map(({ key, label, maxLength }, index) => (
                  <label key={key}>
                    <span>{label}</span>
                    {key === "description" ? (
                      <textarea className="pp-input" value={draft[key]} rows={4} maxLength={maxLength} disabled={saving}
                        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                    ) : (
                      <input className="pp-input" value={draft[key]} maxLength={maxLength} disabled={saving} autoFocus={index === 0}
                        inputMode={key === "website" ? "url" : undefined}
                        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
                    )}
                  </label>
                ))}
                <div className="pp-org-profile-form-actions">
                  <button type="button" className="pp-btn pp-btn-ghost" onClick={() => setDraft(null)} disabled={saving}>Cancel</button>
                  <button type="submit" className="pp-btn pp-btn-primary" disabled={saving} aria-busy={saving}>
                    {saving ? <><InlineSpinner /> Saving…</> : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <DetailRows className="pp-org-profile-details" rows={[
                ...lockedRows,
                ["Headquarters", details.location],
                ["Website", website ? <a href={website} target="_blank" rel="noopener noreferrer">{details.website}</a> : details.website],
                ["Description", details.description],
              ]} />
            )}
          </Panel>

          <Verification status={status} since={verification?.verified_at} domain={verification?.verification_domain} />

          <Panel
            title="Authorised People"
            style={{ gridArea: "people" }}
            bodyStyle={{ padding: 0 }}
            action={org.can.invite ? (
              <Link to="/inst/team#invite-member" className="pp-btn pp-btn-outline pp-org-profile-action">
                <UserPlus size={14} aria-hidden="true" /> Invite Member
              </Link>
            ) : undefined}
          >
            {org.loading ? (
              <p className="pp-org-profile-empty" role="status">Loading team members…</p>
            ) : org.error ? (
              <p className="pp-org-profile-empty" role="alert">{org.error}</p>
            ) : !org.available || org.activeMembers.length === 0 ? (
              <p className="pp-org-profile-empty">{org.available ? "No active members yet." : "Organisation team data is unavailable."}</p>
            ) : (
              <ul className="pp-org-profile-roster pp-divided-list">
                {org.activeMembers.map((member) => (
                  <li key={member.user_id}>
                    <Avatar name={member.full_name || member.email}
                      src={member.user_id === user?.id ? profile.avatar_url : member.avatar_url} size={36} />
                    <div className="pp-org-profile-member">
                      <strong>{member.full_name || member.email}</strong>
                      {member.full_name && <span>{member.email}</span>}
                    </div>
                    <span className="pp-org-profile-role">{ORG_ROLE_LABEL[member.role]}</span>
                  </li>
                ))}
              </ul>
            )}
            {org.available && (
              <div className="pp-org-profile-team-footer">
                <Link to="/inst/team" className="pp-link-muted">
                  Manage Team and Roles <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            )}
          </Panel>

          <Panel title="Workspace Access" style={{ gridArea: "access" }}>
            <DetailRows className="pp-org-profile-metadata" rows={[
              ["Your role", workspaceStatus ?? (role ? ORG_ROLE_LABEL[role] : "No active role")],
              ["Active members", workspaceStatus ?? String(org.activeMembers.length)],
              ["Pending invitations", workspaceStatus ?? (org.can.invite ? String(org.invites.length) : "—")],
            ]} />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
