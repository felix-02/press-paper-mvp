import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, FileText, Image as ImageIcon, Lock, Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { PageHeader } from "@/components/dashboard/Panels";
import { TypeBadge } from "@/components/release/ReleaseTypeBadge";
import { ReleaseCategories, ReleaseFileList, ReleaseGallery, useReleaseFileUrls } from "@/components/release/ReleaseFiles";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { InlineSpinner, Verified } from "@/components/primitives/Bits";
import type { Institution, ReleaseAsset, ReleaseStatus } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { supabase, type ReleaseRow } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useOrg } from "@/lib/useOrg";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { track } from "@/lib/analytics";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { usePageTitle } from "@/lib/usePageTitle";
import { assetFromFile, fileExtension, fileGroups, readReleaseExtras, releaseFileTypes, RELEASE_FILES_BUCKET, type EditableAsset, type FileGroup } from "@/lib/releaseAssets";
import { CategoryField, FieldLabel, PublishFiles } from "./PublishFields";

const TYPES = ["Announcement", "Publication", "Consultation", "Statistics & Research"];
const SCENES = [
  { scene: "wind-farm", label: "Renewables" },
  { scene: "parliament", label: "Government" },
  { scene: "cardiff-bay", label: "Cardiff Bay" },
  { scene: "coast", label: "Coast" },
  { scene: "town", label: "Community" },
  { scene: "skyline", label: "City" },
];

export function Publish() {
  const navigate = useNavigate();
  const { id: editingId } = useParams();
  usePageTitle(editingId ? "Edit release" : "Publish");
  const pushToast = useAppStore((s) => s.pushToast);
  const { user, profile, profileReady } = useAuth();
  const org = useOrg();
  const previewInstitution: Institution = {
    slug: org.slug || profile?.institution_slug || "institution",
    name: profile?.institution_name?.trim() || "Your organisation",
    category: profile?.org_category?.trim() || "Institution",
    verified: org.verified,
    color: "#606060",
    color2: "#454545",
    mark: "generic",
  };

  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("Announcement");
  const [customType, setCustomType] = useState(false);
  const [scene, setScene] = useState("none");
  const [categories, setCategories] = useState<string[]>([]);
  const [files, setFiles] = useState<EditableAsset[]>([]);
  const [recording, setRecording] = useState(false);
  const localUrls = useRef(new Set<string>());
  const draftId = useRef<string | null>(null);
  const uploaded = useRef(new Map<string, string>());
  const urls = useReleaseFileUrls(files);
  const [originalPublishedAt, setOriginalPublishedAt] = useState<string | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(Boolean(editingId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [headingError, setHeadingError] = useState(false);
  const [subheadingError, setSubheadingError] = useState(false);
  const [busyStatus, setBusyStatus] = useState<ReleaseStatus | null>(null);
  const busy = busyStatus !== null;
  const [reviewing, setReviewing] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [dbTypes, setDbTypes] = useState<string[]>([]);
  const [platformCovers, setPlatformCovers] = useState<{ label: string; url: string }[]>([]);

  // Platform catalogue: release types + extra covers managed by the super admin.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.from("platform_release_types").select("name").order("created_at").then(({ data }) => {
      if (active) setDbTypes(((data as { name: string }[] | null) ?? []).map((r) => r.name));
    });
    void supabase.from("platform_covers").select("label, url").order("created_at").then(({ data }) => {
      if (active) setPlatformCovers(((data as { label: string; url: string }[] | null) ?? []));
    });
    return () => { active = false; };
  }, []);
  const availableTypes = dbTypes.length > 0 ? dbTypes : TYPES;
  const otherType = customType || !availableTypes.includes(type);

  const fileError = (description: string) => pushToast({ title: "Couldn't add file", description, variant: "error" });
  const addFiles = (group: FileGroup, items: File[]) => {
    const config = fileGroups[group];
    let available = config.limit - files.filter(file => config.kinds.includes(file.kind)).length;
    const added: EditableAsset[] = [];
    for (const file of items) {
      if (available <= 0) { fileError(`You can add up to ${config.limit} files in this section.`); break; }
      try {
        const asset = assetFromFile(file, group);
        if (asset.localUrl) localUrls.current.add(asset.localUrl);
        added.push(asset);
        available--;
      } catch (error) {
        if (error instanceof Error) fileError(error.message);
      }
    }
    setFiles(current => [...current, ...added]);
  };
  const removeFile = (path: string) => {
    const url = files.find(file => file.path === path)?.localUrl;
    if (url) { URL.revokeObjectURL(url); localUrls.current.delete(url); }
    setFiles(current => current.filter(file => file.path !== path));
  };
  const moveMedia = (from: string, to: string) => setFiles(current => {
    const media = current.filter(file => file.kind === "image" || file.kind === "video");
    const fromIndex = media.findIndex(file => file.path === from);
    const toIndex = media.findIndex(file => file.path === to);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
    media.splice(toIndex, 0, media.splice(fromIndex, 1)[0]);
    return [...media, ...current.filter(file => file.kind !== "image" && file.kind !== "video")];
  });
  useEffect(() => {
    const pending = localUrls.current;
    return () => { pending.forEach(url => URL.revokeObjectURL(url)); pending.clear(); };
  }, [editingId]);

  const headingRef = useRef<HTMLInputElement>(null);
  const subheadingRef = useRef<HTMLInputElement>(null);

  // Guard against losing unsaved work on refresh/close. In-app navigation is
  // still free — drafts save in one click and nothing here is destructive.
  const snapshot = JSON.stringify([heading, subheading, body, type, scene, categories, files]);
  const dirty = !busy && !loadingRelease && snapshot !== savedSnapshot;
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!editingId) {
      setHeading("");
      setSubheading("");
      setBody("");
      setType("Announcement");
      setCustomType(false);
      setScene("none");
      setCategories([]);
      setFiles([]);
      draftId.current = null;
      uploaded.current.clear();
      setOriginalPublishedAt(null);
      setHeadingError(false);
      setSubheadingError(false);
      setReviewing(false);
      setLoadingRelease(false);
      setLoadError(null);
      setSavedSnapshot(JSON.stringify(["", "", "", "Announcement", "none", [], []]));
      return;
    }
    if (!profileReady || org.loading) {
      setLoadingRelease(true);
      return;
    }
    if (!supabase || !org.slug) {
      setLoadingRelease(false);
      setLoadError("This release isn't available in an organisation workspace.");
      return;
    }

    let active = true;
    setLoadingRelease(true);
    setLoadError(null);
    supabase
      .from("release_details")
      .select("*")
      .eq("id", editingId)
      .eq("institution_slug", org.slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        const row = data as ReleaseRow | null;
        if (error || !row) {
          setLoadError("We couldn't load that release. It may have been removed or you may not have access.");
          setLoadingRelease(false);
          return;
        }
        setHeading(row.heading);
        setSubheading(row.subheading ?? "");
        setBody(row.body ?? "");
        const extras = readReleaseExtras(row.extras, row.institution_slug, row.id);
        const savedType = row.type.trim() || "Announcement";
        setType(savedType);
        setCustomType(false);
        setScene(row.scene || "none");
        setCategories(extras?.categories ?? []);
        setFiles(extras?.files ?? []);
        uploaded.current.clear();
        setOriginalPublishedAt(row.published_at);
        setSavedSnapshot(JSON.stringify([
          row.heading,
          row.subheading ?? "",
          row.body ?? "",
          savedType,
          row.scene || "none",
          extras?.categories ?? [],
          extras?.files ?? [],
        ]));
        setLoadingRelease(false);
      });

    return () => {
      active = false;
    };
  }, [editingId, profileReady, org.loading, org.slug]);

  const requireHeading = (): boolean => {
    if (!heading.trim()) {
      setHeadingError(true);
      headingRef.current?.focus();
      pushToast({ title: "Add a heading to continue", description: "Every release needs a headline before it can be published.", variant: "info" });
      return false;
    }
    if (heading.trim().length > 200 || subheading.length > 250 || body.length > 200000) {
      pushToast({ title: "Release is too long", description: "Shorten the headline, summary, or body before saving.", variant: "info" });
      return false;
    }
    if (!type.trim()) {
      document.getElementById("publish-custom-type")?.focus();
      pushToast({ title: "Choose or enter a release type", variant: "info" });
      return false;
    }
    return true;
  };

  const validateForPublish = (): boolean => {
    if (!requireHeading()) return false;
    if (!subheading.trim()) {
      setSubheadingError(true);
      subheadingRef.current?.focus();
      pushToast({ title: "Add a subheading to continue", description: "Summarise the release before reviewing it.", variant: "info" });
      return false;
    }
    const bodyText = body.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim();
    if (!bodyText) {
      document.querySelector<HTMLElement>(".pp-rte")?.focus();
      pushToast({ title: "Add the release body to continue", description: "The full official text is required before publishing.", variant: "info" });
      return false;
    }
    return true;
  };

  // All releases persist to the organisation workspace in Postgres.
  const persist = async (status: ReleaseStatus): Promise<string | null> => {
    if (!supabase || !user) {
      pushToast({ title: "Publishing is unavailable", description: "Reconnect your account and try again.", variant: "error" });
      return null;
    }
    if (!org.slug || !org.can.publish || (status === "Published" && !org.verified)) {
      pushToast({ title: "Publishing access is unavailable", description: "Your organisation membership or verification is incomplete.", variant: "error" });
      return null;
    }

    const id = editingId ?? (draftId.current ??= crypto.randomUUID());
    const storedFiles: ReleaseAsset[] = [];
    const storage = supabase.storage.from(RELEASE_FILES_BUCKET);
    for (const { file, path, kind, name, bytes, alt, transcript } of files) {
      let storedPath = path;
      if (file) {
        const previous = uploaded.current.get(path);
        if (previous) storedPath = previous;
        else {
          const extension = fileExtension(path)!;
          storedPath = `${org.slug}/${id}/${crypto.randomUUID()}.${extension}`;
          const { error } = await storage.upload(storedPath, file, { contentType: releaseFileTypes[extension][1], upsert: false });
          if (error) {
            pushToast({ title: "Couldn't upload file", description: `${name}: ${error.message}`, variant: "error" });
            return null;
          }
          uploaded.current.set(path, storedPath);
        }
      }
      storedFiles.push({ path: storedPath, kind, name, bytes, alt: alt?.trim() || undefined, transcript: transcript?.trim() || undefined });
    }

    const content = {
      type: type.trim(),
      status,
      heading: heading.trim(),
      subheading: subheading.trim() || null,
      body: body.trim() || null,
      scene,
      extras: { categories, files: storedFiles },
      published_at: status === "Published" ? (originalPublishedAt ?? new Date().toISOString()) : null,
    };

    const result = editingId
      ? await supabase
          .from("releases")
          .update(content)
          .eq("id", editingId)
          .eq("institution_slug", org.slug)
          .select("id")
          .maybeSingle()
      : await supabase.from("releases").insert({
        id,
        owner: user.id,
        institution_slug: org.slug,
        institution_name: profile?.institution_name ?? null,
        ...content,
      }).select("id").single();

    const persisted = result.data as { id: string } | null;
    if (result.error || !persisted?.id) {
      pushToast({ title: "Couldn't save release", description: "Check your publishing access and try again.", variant: "error" });
      return null;
    }
    return persisted.id;
  };

  const submit = async (status: ReleaseStatus) => {
    if (busy || recording) return;
    if (!requireHeading()) return;
    setBusyStatus(status);
    let releaseId: string | null = null;
    try {
      releaseId = await persist(status);
    } catch {
      pushToast({ title: "Couldn't save release", description: "Check your connection and try again.", variant: "error" });
    } finally {
      setBusyStatus(null);
    }
    if (!releaseId) return;
    setSavedSnapshot(snapshot);
    track(status === "Published" ? "release_published" : "release_draft_saved", { releaseId, status, type });
    if (status === "Published") {
      pushToast({ title: "Release published", description: "It's now live in your organisation's releases.", variant: "success" });
    } else {
      pushToast({ title: "Saved as draft", description: "Your draft is available in Releases.", variant: "info" });
    }
    navigate("/inst/releases");
  };

  const publish = () => {
    if (!org.verified) {
      pushToast({ title: "Approval required before publishing", description: "You can continue saving drafts while the organisation is reviewed.", variant: "info" });
      return;
    }
    if (validateForPublish()) setReviewing(true);
  };
  const saveDraft = () => submit("Draft");

  useEffect(() => {
    if (!reviewing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setReviewing(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reviewing, busy]);

  if (!profileReady || org.loading || loadingRelease) {
    return (
      <AppShell kind="institution" maxWidth={760}>
        <div style={{ minHeight: "50vh", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>Checking publishing access…</div>
      </AppShell>
    );
  }

  if (org.error) {
    return (
      <AppShell kind="institution" maxWidth={760}>
        <div className="pp-card" role="alert" style={{ padding: 40, textAlign: "center" }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>We couldn't check publishing access</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 18px" }}>{org.error}</p>
          <button type="button" className="pp-btn pp-btn-outline" onClick={() => void org.refresh()}>Retry</button>
        </div>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell kind="institution" maxWidth={760}>
        <div className="pp-card" role="alert" style={{ padding: 40, textAlign: "center" }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Release unavailable</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 18px" }}>{loadError}</p>
          <button type="button" className="pp-btn pp-btn-outline" onClick={() => navigate("/inst/releases")}>Back to releases</button>
        </div>
      </AppShell>
    );
  }

  // Publishing fails closed when organisation membership is missing or inactive.
  if (!org.available || !org.can.publish) {
    return (
      <AppShell kind="institution" maxWidth={760}>
        <div className="pp-card" style={{ padding: 40, textAlign: "center" }}>
          <Lock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <h1 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Publishing isn't available for your account</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto" }}>
            {org.status === "pending"
              ? "Your membership is awaiting owner approval. Once approved with an editor or admin role, you'll be able to create releases."
              : org.status === "active"
                ? "Your role has read-only access. Ask the organisation owner to grant you an editor role."
                : "Your organisation membership is missing or inactive. Ask an owner or platform administrator to restore access."}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell kind="institution" maxWidth={1180}>
      <PageHeader title={editingId ? "Edit release" : "Publish"} subtitle={editingId ? "Update this release, review it, then save or publish when ready." : "Create and publish an official release to the public."} />

      {!org.verified && (
        <div className="pp-card" style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 12, borderColor: "rgba(166, 166, 166, 0.35)" }}>
          <ShieldCheck size={18} color="var(--amber)" />
          <div style={{ flex: 1, fontSize: 13.5, color: "var(--text-secondary)" }}>You can save drafts now. Publishing unlocks after platform approval.</div>
          {org.role === "owner" && <button type="button" onClick={() => navigate("/inst/profile")} className="pp-btn pp-btn-ghost">View review status</button>}
        </div>
      )}

      <div className="pp-responsive-grid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 24, alignItems: "start" }}>
        {/* form */}
        <fieldset className="pp-card pp-publish-form" disabled={busy}>
          <div style={{ marginBottom: 20 }}>
            <FieldLabel hint={heading.length > 150 ? `${heading.length}/200` : "Required"}><label htmlFor="publish-heading">Heading</label></FieldLabel>
            <input
              id="publish-heading"
              ref={headingRef}
              className="pp-input"
              placeholder="Write a clear, specific headline"
              value={heading}
              maxLength={200}
              onChange={(e) => {
                setHeading(e.target.value);
                if (headingError && e.target.value.trim()) setHeadingError(false);
              }}
              style={{
                fontSize: 15.5,
                borderColor: headingError ? "var(--red)" : undefined,
                boxShadow: headingError ? "0 0 0 3px rgba(142, 142, 142, 0.15)" : undefined,
              }}
            />
            {headingError && (
              <span style={{ display: "block", fontSize: 12.5, color: "var(--red)", marginTop: 6 }}>
                Please add a headline before publishing.
              </span>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <FieldLabel hint={subheading.length > 190 ? `${subheading.length}/250` : "Required to publish"}><label htmlFor="publish-subheading">Subheading</label></FieldLabel>
            <input
              id="publish-subheading"
              ref={subheadingRef}
              className="pp-input"
              placeholder="One or two sentences summarising the release"
              value={subheading}
              maxLength={250}
              onChange={(e) => {
                setSubheading(e.target.value);
                if (subheadingError && e.target.value.trim()) setSubheadingError(false);
              }}
              style={{
                borderColor: subheadingError ? "var(--red)" : undefined,
                boxShadow: subheadingError ? "0 0 0 3px rgba(142,142,142,0.15)" : undefined,
              }}
            />
            {subheadingError && (
              <span style={{ display: "block", fontSize: 12.5, color: "var(--red)", marginTop: 6 }}>
                Add a short summary — it's what readers see in their feed.
              </span>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <FieldLabel hint="Required · rich text">Body</FieldLabel>
            <RichTextEditor value={body} onChange={setBody} placeholder="Write the full release here…" />
          </div>

          <div className="pp-publish-fields">
            <section>
              <FieldLabel hint="Required">Release type</FieldLabel>
              <div className="pp-publish-types" role="group" aria-label="Release type">
                {availableTypes.map(item => (
                  <button key={item} type="button" aria-pressed={!otherType && type === item} onClick={() => { setCustomType(false); setType(item); }}>{item}</button>
                ))}
                <button type="button" aria-pressed={otherType} onClick={() => {
                  if (!otherType) setType("");
                  setCustomType(true);
                }}><Plus size={13} /> Other</button>
              </div>
              {otherType && <>
                <input id="publish-custom-type" className="pp-input" aria-label="Custom release type" placeholder="Enter a release type" maxLength={80}
                  value={type} onChange={event => setType(event.target.value)} />
                <p className="pp-publish-hint">Used for this release only. Readers see it as the release type.</p>
              </>}
            </section>
            <CategoryField key={editingId ?? "new"} categories={categories} onChange={setCategories} />
            <PublishFiles files={files} urls={urls} recording={recording} onRecording={setRecording} onAdd={addFiles}
              onRemove={removeFile} onMove={moveMedia} onError={fileError}
              onChange={(path, changes) => setFiles(current => current.map(file => file.path === path ? { ...file, ...changes } : file))}
              covers={<details className="pp-publish-transcript">
                <summary>Choose a cover from the catalogue</summary>
                <select className="pp-input" aria-label="Catalogue cover" value={scene} onChange={event => setScene(event.target.value)}>
                  <option value="none">No cover</option>
                  {SCENES.map(cover => <option value={cover.scene} key={cover.scene}>{cover.label}</option>)}
                  {platformCovers.map(cover => <option value={cover.url} key={cover.url}>{cover.label}</option>)}
                  {scene !== "none" && !SCENES.some(cover => cover.scene === scene) && !platformCovers.some(cover => cover.url === scene) &&
                    <option value={scene}>Existing cover</option>}
                </select>
              </details>}
            />
          </div>

          <div className="pp-publish-actions">
            <button type="button" onClick={publish} disabled={busy || recording || !org.verified} className="pp-btn pp-btn-primary">
              <Send size={16} /> {!org.verified ? "Approval required" : originalPublishedAt ? "Review & republish" : "Review & publish"}
            </button>
            <button type="button" onClick={saveDraft} disabled={busy || recording} aria-busy={busyStatus === "Draft"} className="pp-btn pp-btn-outline" title={originalPublishedAt ? "Removes the release from public view and keeps it as a draft" : undefined}>
              {busyStatus === "Draft" ? <InlineSpinner /> : <FileText size={16} />} {busyStatus === "Draft" ? "Saving…" : originalPublishedAt ? "Unpublish to draft" : "Save as draft"}
            </button>
          </div>
        </fieldset>

        {/* live preview */}
        <div className="pp-publish-preview" style={{ position: "sticky", top: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 12 }}>
            Live preview
          </div>
          <article className="pp-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
              <InstitutionMark institution={previewInstitution} size={38} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{previewInstitution.name}</span>
                  {previewInstitution.verified && <Verified size={13} />}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Just now</div>
              </div>
            </div>
            <ReleaseGallery key={files.filter(file => file.kind === "image" || file.kind === "video").map(file => file.path).join(",")}
              files={files} urls={urls} scene={scene} style={{ marginBottom: 12 }} />
            <TypeBadge type={type.trim() || "Release type"} />
            <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, marginTop: 10, color: heading.trim() ? "var(--text)" : "var(--text-faint)" }}>
              {heading.trim() || "Your headline will appear here"}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 7 }}>
              {subheading.trim() || "Your summary will appear here as readers see it in their feed."}
            </p>
            <ReleaseCategories categories={categories} />
            <ReleaseFileList files={files} urls={urls} />
          </article>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 16, color: "var(--text-muted)", fontSize: 12.5, lineHeight: 1.5 }}>
            <ImageIcon size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>This is how your release will appear in readers' feeds. Publishing makes it visible to the public immediately.</span>
          </div>
        </div>
      </div>

      {reviewing && (
        <div
          className="pp-modal-layer"
          onClick={() => !busy && setReviewing(false)}
          style={{ display: "grid", placeItems: "center", padding: 24 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-release-title"
            onClick={(event) => event.stopPropagation()}
            className="pp-card pp-modal-dialog"
            style={{ width: "100%", maxWidth: 760, maxHeight: "88vh", overflowY: "auto", padding: 26 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 650, color: "var(--green)", textTransform: "uppercase", marginBottom: 7 }}>Content complete · Review</div>
                <h2 id="review-release-title" style={{ fontSize: 22, fontWeight: 700 }}>Review before publishing</h2>
                <p style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 13.5 }}>Check the public version below. You can go back to edit or publish it immediately.</p>
              </div>
              <TypeBadge type={type} />
            </div>

            <ReleaseGallery files={files} urls={urls} scene={scene} style={{ marginTop: 22 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
              <InstitutionMark institution={previewInstitution} size={36} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13.5, fontWeight: 650 }}>
                  {previewInstitution.name} {previewInstitution.verified && <Verified size={12} />}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Publishes immediately</div>
              </div>
            </div>
            <h3 style={{ fontSize: 25, lineHeight: 1.2, marginTop: 18 }}>{heading.trim()}</h3>
            <p style={{ marginTop: 10, color: "var(--text-secondary)", lineHeight: 1.6 }}>{subheading.trim()}</p>
            <ReleaseCategories categories={categories} />
            <ReleaseFileList files={files} urls={urls} />
            <div className="pp-prose" style={{ marginTop: 22 }} dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }} />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              <button type="button" className="pp-btn pp-btn-ghost" onClick={() => setReviewing(false)} disabled={busy}>Back to edit</button>
              <button type="button" className="pp-btn pp-btn-primary" onClick={() => void submit("Published")} disabled={busy} aria-busy={busyStatus === "Published"} style={{ opacity: busy ? 0.7 : 1 }}>
                {busyStatus === "Published" ? <InlineSpinner /> : <Send size={16} />} {busyStatus === "Published" ? "Publishing…" : "Publish release"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
