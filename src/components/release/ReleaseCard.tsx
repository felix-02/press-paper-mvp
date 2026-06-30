import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  Plus,
  Sparkles,
  MessageCircleQuestion,
  MoreHorizontal,
  Link2,
  ExternalLink,
  ListPlus,
} from "lucide-react";
import type { Release } from "@/types";
import { inst } from "@/data/institutions";
import { useAppStore } from "@/store/useAppStore";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { MediaTile } from "@/components/media/MediaTile";
import { TypeBadge } from "@/components/release/ReleaseTypeBadge";
import { Verified } from "@/components/primitives/Bits";
import { TagList } from "@/components/common/TagList";
import { useEngagement } from "@/lib/engagement";
import { formatCount } from "@/lib/releaseMap";

function FooterAction({
  icon,
  label,
  onClick,
  active,
  activeColor = "var(--blue)",
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        color: active ? activeColor : "var(--text-muted)",
        transition: "color 0.14s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "var(--text-secondary)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Stat({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13 }}>
      {icon}
      {value}
    </span>
  );
}

function CardMenu({ release }: { release: Release }) {
  const navigate = useNavigate();
  const saved = useAppStore((s) => s.savedIds.has(release.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const pushToast = useAppStore((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const close = () => setOpen(false);
  const row = (icon: ReactNode, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={() => {
        onClick();
        close();
      }}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13.5, color: "var(--text)", background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ color: "var(--text-muted)", padding: 4 }} aria-label="More options">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 200,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-lg)",
            padding: 5,
            zIndex: 50,
          }}
        >
          {row(<ExternalLink size={15} />, "Open release", () => navigate(`/release/${release.id}`))}
          {row(
            saved ? <BookmarkCheck size={15} color="var(--blue)" /> : <Bookmark size={15} />,
            saved ? "Remove from saved" : "Save",
            () => {
              const now = toggleSaved(release.id);
              pushToast({ title: now ? "Saved" : "Removed from saved", variant: now ? "success" : "info" });
            }
          )}
          {row(<ListPlus size={15} />, "Add to watchlist", () => navigate(`/release/${release.id}`))}
          {row(<Link2 size={15} />, "Copy link", () => {
            try {
              void navigator.clipboard.writeText(`${window.location.origin}/r/${release.id}`);
              pushToast({ title: "Link copied", variant: "success" });
            } catch {
              pushToast({ title: "Couldn't copy link", variant: "info" });
            }
          })}
        </div>
      )}
    </div>
  );
}

function useCardActions(release: Release) {
  const navigate = useNavigate();
  const saved = useAppStore((s) => s.savedIds.has(release.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);
  const pushToast = useAppStore((s) => s.pushToast);

  const open = () => navigate(`/release/${release.id}`);
  const onSave = () => {
    const now = toggleSaved(release.id);
    pushToast({
      title: now ? "Saved" : "Removed from saved",
      description: now ? "Added to your saved releases." : undefined,
      variant: now ? "success" : "info",
    });
  };
  return { open, saved, onSave };
}

function CardFooter({ release }: { release: Release }) {
  const { open, saved, onSave } = useCardActions(release);
  const eng = useEngagement(release.id);
  const viewsLabel = eng ? formatCount(eng.views) : release.views;
  const commentsLabel = eng ? formatCount(eng.comments) : release.comments;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 14,
        paddingTop: 13,
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        <Stat icon={<Eye size={15} />} value={viewsLabel} />
        <Stat icon={<MessageSquare size={15} />} value={commentsLabel} />
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <FooterAction
          icon={<Bookmark size={15} fill={saved ? "var(--blue)" : "none"} />}
          label={saved ? "Saved" : "Save"}
          onClick={onSave}
          active={saved}
        />
        <FooterAction icon={<Plus size={15} />} label="Watchlist" onClick={open} />
        <FooterAction icon={<Sparkles size={15} />} label="AI Summary" onClick={open} />
        <FooterAction icon={<MessageCircleQuestion size={15} />} label="Ask Anything" onClick={open} />
      </div>
    </div>
  );
}

/** Feed card (USER-01 / USER-02). */
function FeedCard({ release, showFollow }: { release: Release; showFollow?: boolean }) {
  const i = inst(release.institutionSlug);
  const { open } = useCardActions(release);
  const following = useAppStore((s) => s.followedSlugs.has(i.slug));
  const toggleFollow = useAppStore((s) => s.toggleFollow);

  return (
    <article className="pp-card" style={{ padding: 18 }}>
      {/* institution row */}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <InstitutionMark institution={i} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>{i.name}</span>
            <Verified size={14} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 1 }}>{release.time}</div>
        </div>
        {showFollow ? (
          <button
            type="button"
            className={following ? "pp-btn pp-btn-ghost" : "pp-btn pp-btn-blue"}
            style={{ padding: "6px 16px", fontSize: 13 }}
            onClick={() => toggleFollow(i.slug)}
          >
            {following ? "Following" : "Follow"}
          </button>
        ) : (
          <CardMenu release={release} />
        )}
      </div>

      {/* body */}
      <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TypeBadge type={release.type} />
          <h3
            onClick={open}
            style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.32, marginTop: 10, cursor: "pointer", letterSpacing: "-0.01em" }}
          >
            {release.heading}
          </h3>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              marginTop: 7,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {release.subheading}
          </p>
          <div style={{ marginTop: 12 }}>
            <TagList tags={release.tags} max={2} />
          </div>
        </div>
        <div onClick={open} style={{ width: 208, height: 152, flexShrink: 0, cursor: "pointer" }}>
          <MediaTile scene={release.scene} play playPos="center" radius={12} />
        </div>
      </div>

      <CardFooter release={release} />
    </article>
  );
}

/** Compact saved / list card (USER-03 / USER-05). */
function SavedCard({ release }: { release: Release }) {
  const i = inst(release.institutionSlug);
  const { open } = useCardActions(release);

  return (
    <article className="pp-card" style={{ padding: 16, display: "flex", gap: 16 }}>
      <div onClick={open} style={{ width: 168, height: 120, flexShrink: 0, cursor: "pointer" }}>
        <MediaTile scene={release.scene} play playPos="center" radius={10} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TypeBadge type={release.type} />
        <h3
          onClick={open}
          style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.34, marginTop: 8, cursor: "pointer", letterSpacing: "-0.01em" }}
        >
          {release.heading}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7 }}>
          <InstitutionMark institution={i} size={18} />
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{i.name}</span>
          <Verified size={12} />
          <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>· {release.time}</span>
        </div>
        <CardFooter release={release} />
      </div>
    </article>
  );
}

export function ReleaseCard({
  release,
  variant = "feed",
  showFollow = false,
}: {
  release: Release;
  variant?: "feed" | "saved";
  showFollow?: boolean;
}) {
  return variant === "saved" ? (
    <SavedCard release={release} />
  ) : (
    <FeedCard release={release} showFollow={showFollow} />
  );
}
