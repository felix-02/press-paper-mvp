import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, FileText, Image as ImageIcon, Check, Lock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { PageHeader } from "@/components/dashboard/Panels";
import { TypeBadge } from "@/components/release/ReleaseTypeBadge";
import { MediaTile } from "@/components/media/MediaTile";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { Verified } from "@/components/primitives/Bits";
import { inst } from "@/data/institutions";
import type { MediaScene, ReleaseStatus, ReleaseType, Release } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useOrg } from "@/lib/useOrg";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { track } from "@/lib/analytics";

const TYPES: ReleaseType[] = ["Announcement", "Publication", "Consultation", "Statistics & Research"];
const SCENES: { scene: MediaScene; label: string }[] = [
  { scene: "wind-farm", label: "Renewables" },
  { scene: "parliament", label: "Government" },
  { scene: "cardiff-bay", label: "Cardiff Bay" },
  { scene: "coast", label: "Coast" },
  { scene: "town", label: "Community" },
  { scene: "skyline", label: "City" },
];

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{children}</span>
      {hint && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{hint}</span>}
    </div>
  );
}

export function Publish() {
  const navigate = useNavigate();
  const publishRelease = useAppStore((s) => s.publishRelease);
  const pushToast = useAppStore((s) => s.pushToast);
  const { configured, user, profile } = useAuth();
  const org = useOrg();

  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<ReleaseType>("Announcement");
  const [scene, setScene] = useState<MediaScene>("wind-farm");
  const [headingError, setHeadingError] = useState(false);
  const [busy, setBusy] = useState(false);

  const headingRef = useRef<HTMLInputElement>(null);

  const buildRelease = (status: ReleaseStatus): Release => ({
    id: `pub-${Date.now()}`,
    institutionSlug: "welsh-government",
    type,
    status,
    heading: heading.trim(),
    subheading: subheading.trim() || "Published via the Presspaper publishing studio.",
    time: "Just now",
    publishedDate: status === "Published" ? "Just now" : "Draft",
    publishedTime: "",
    scene,
    tags: [],
    views: "0",
    comments: "0",
    engagement: "0",
    body: body.trim() || null,
    isNew: true,
  });

  const requireHeading = (): boolean => {
    if (!heading.trim()) {
      setHeadingError(true);
      headingRef.current?.focus();
      pushToast({ title: "Add a heading to continue", description: "Every release needs a headline before it can be published.", variant: "info" });
      return false;
    }
    return true;
  };

  // Writes the release to Postgres in LIVE mode (so it persists across sessions
  // and devices), or to the in-memory store in DEMO mode.
  const persist = async (status: ReleaseStatus): Promise<boolean> => {
    if (configured && supabase && user) {
      const { error } = await supabase.from("releases").insert({
        owner: user.id,
        institution_slug: profile?.institution_slug ?? "welsh-government",
        institution_name: profile?.institution_name ?? null,
        type,
        status,
        heading: heading.trim(),
        subheading: subheading.trim() || null,
        body: body.trim() || null,
        scene,
        published_at: status === "Published" ? new Date().toISOString() : null,
      });
      if (error) {
        pushToast({ title: "Couldn't save release", description: error.message, variant: "info" });
        return false;
      }
      return true;
    }
    // Demo mode
    publishRelease(buildRelease(status));
    return true;
  };

  const submit = async (status: ReleaseStatus) => {
    if (busy) return;
    if (!requireHeading()) return;
    setBusy(true);
    const ok = await persist(status);
    setBusy(false);
    if (!ok) return;
    track("release_published", { status, type });
    if (status === "Published") {
      pushToast({ title: "Release published", description: "It's now live and appears at the top of your releases.", variant: "success" });
    } else {
      pushToast({ title: "Saved as draft", description: "You can publish it any time from Releases.", variant: "info" });
    }
    navigate("/inst/releases");
  };

  const publish = () => submit("Published");
  const saveDraft = () => submit("Draft");

  // Gate: role must allow publishing AND the org must have verified its domain.
  if (org.available && !org.canPublishNow) {
    const roleBlocked = !org.can.publish;
    return (
      <AppShell kind="institution" maxWidth={760}>
        <div className="pp-card" style={{ padding: 40, textAlign: "center" }}>
          <Lock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          {roleBlocked ? (
            <>
              <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Publishing isn't available for your role</h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 420, margin: "0 auto" }}>
                {org.status === "pending"
                  ? "Your membership is awaiting owner approval. Once approved with an editor or admin role, you'll be able to publish."
                  : "Your role has read-only access. Ask an owner or admin to grant you an editor role to publish releases."}
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Verify your domain to publish</h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 16px" }}>
                To prevent impersonation, an organisation must prove it controls its official domain before it can publish.
                {org.role === "owner"
                  ? " Add the DNS record on your Profile to get verified."
                  : " Your organisation's owner needs to complete domain verification."}
              </p>
              {org.role === "owner" && (
                <button type="button" onClick={() => navigate("/inst/profile")} className="pp-btn pp-btn-primary">
                  <ShieldCheck size={15} /> Verify domain
                </button>
              )}
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell kind="institution" maxWidth={1180}>
      <PageHeader title="Publish" subtitle="Create and publish an official release to the public." />

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 24, alignItems: "start" }}>
        {/* form */}
        <div className="pp-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <FieldLabel hint="Required">Headline</FieldLabel>
            <input
              ref={headingRef}
              className="pp-input"
              placeholder="Write a clear, specific headline"
              value={heading}
              onChange={(e) => {
                setHeading(e.target.value);
                if (headingError && e.target.value.trim()) setHeadingError(false);
              }}
              style={{
                fontSize: 15.5,
                borderColor: headingError ? "var(--red)" : undefined,
                boxShadow: headingError ? "0 0 0 3px rgba(248,113,113,0.15)" : undefined,
              }}
            />
            {headingError && (
              <span style={{ display: "block", fontSize: 12.5, color: "var(--red)", marginTop: 6 }}>
                Please add a headline before publishing.
              </span>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <FieldLabel hint="Optional">Summary</FieldLabel>
            <input
              className="pp-input"
              placeholder="One or two sentences summarising the release"
              value={subheading}
              onChange={(e) => setSubheading(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <FieldLabel hint="Rich text">Body</FieldLabel>
            <RichTextEditor value={body} onChange={setBody} placeholder="Write the full release here…" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <FieldLabel>Release type</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TYPES.map((t) => {
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "8px 14px",
                      borderRadius: "var(--r-pill)",
                      border: `1px solid ${active ? "var(--blue)" : "var(--border)"}`,
                      background: active ? "rgba(59,130,246,0.1)" : "var(--surface-2)",
                      color: active ? "var(--blue)" : "var(--text-secondary)",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel hint="Choose a cover">Cover media</FieldLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {SCENES.map(({ scene: s, label }) => {
                const active = scene === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScene(s)}
                    style={{
                      position: "relative",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `2px solid ${active ? "var(--blue)" : "transparent"}`,
                      padding: 0,
                      height: 74,
                    }}
                  >
                    <MediaTile scene={s} radius={8} />
                    <span
                      style={{
                        position: "absolute",
                        left: 7,
                        bottom: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                      }}
                    >
                      {label}
                    </span>
                    {active && (
                      <span style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 999, background: "var(--blue)", display: "grid", placeItems: "center" }}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
            <button type="button" onClick={publish} disabled={busy} className="pp-btn pp-btn-primary" style={{ padding: "11px 20px", opacity: busy ? 0.7 : 1 }}>
              <Send size={16} /> {busy ? "Publishing…" : "Review & Publish"}
            </button>
            <button type="button" onClick={saveDraft} disabled={busy} className="pp-btn pp-btn-outline" style={{ padding: "11px 20px" }}>
              <FileText size={16} /> Save as draft
            </button>
          </div>
        </div>

        {/* live preview */}
        <div style={{ position: "sticky", top: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 12 }}>
            Live preview
          </div>
          <article className="pp-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <InstitutionMark institution={inst("welsh-government")} size={38} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Welsh Government</span>
                  <Verified size={13} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Just now</div>
              </div>
            </div>
            <div style={{ height: 168, marginBottom: 14 }}>
              <MediaTile scene={scene} play radius={12} />
            </div>
            <TypeBadge type={type} />
            <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, marginTop: 10, color: heading.trim() ? "var(--text)" : "var(--text-faint)" }}>
              {heading.trim() || "Your headline will appear here"}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 7 }}>
              {subheading.trim() || "Your summary will appear here as readers see it in their feed."}
            </p>
          </article>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 16, color: "var(--text-muted)", fontSize: 12.5, lineHeight: 1.5 }}>
            <ImageIcon size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>This is how your release will appear in readers' feeds. Publishing makes it visible to the public immediately.</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
