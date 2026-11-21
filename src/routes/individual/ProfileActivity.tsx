import { Link } from "react-router-dom";
import { Activity, Bookmark, Eye, List, MessageCircle, Smile, UserPlus, UserRound } from "lucide-react";
import { useActivity, relativeTime, type ActivityItem } from "@/lib/useActivity";
import type { Institution } from "@/types";

const pages: Record<string, string> = {
  "/": "the Presspaper homepage",
  "/home": "your feed",
  "/explore": "Explore",
  "/saved": "your saved releases",
  "/me": "your profile",
  "/sources": "verified sources",
  "/contact": "the contact page",
  "/help": "Help",
  "/login": "the sign-in page",
  "/signup": "the sign-up page",
};

const actions = {
  "release.saved": { label: "Saved", icon: Bookmark },
  "release.unsaved": { label: "Unsaved", icon: Bookmark },
  "release_viewed": { label: "Viewed", icon: Eye },
  "release.insert": { label: "Created", icon: Activity },
  "release.delete": { label: "Deleted", icon: Activity },
  "release_published": { label: "Published", icon: Activity },
  "release_draft_saved": { label: "Saved a draft of", icon: Activity },
  "release_deleted": { label: "Deleted", icon: Activity },
  "institution.followed": { label: "Followed", icon: UserPlus },
  "institution.unfollowed": { label: "Unfollowed", icon: UserPlus },
  "comment.insert": { label: "Commented on", icon: MessageCircle },
  "comment.update": { label: "Edited a comment on", icon: MessageCircle },
  "comment.delete": { label: "Deleted a comment on", icon: MessageCircle },
  "watchlist.insert": { label: "Created", icon: List },
  "watchlist.update": { label: "Updated", icon: List },
  "watchlist.delete": { label: "Deleted", icon: List },
  "watchlist_item.insert": { label: "Added", icon: List },
  "watchlist_item.update": { label: "Updated", icon: List },
  "watchlist_item.delete": { label: "Removed", icon: List },
  "reaction.added": { label: "Reacted to", icon: Smile },
  "reaction.changed": { label: "Changed your reaction to", icon: Smile },
  "reaction.removed": { label: "Removed your reaction from", icon: Smile },
  "page_viewed": { label: "Visited", icon: Eye },
  "profile.insert": { label: "Created your profile", icon: UserRound },
  "profile.update": { label: "Updated your profile", icon: UserRound },
  "profile.delete": { label: "Deleted a profile", icon: UserRound },
  "signed_up": { label: "Signed up", icon: UserRound },
  "logged_in": { label: "Signed in", icon: UserRound },
  "logged_out": { label: "Signed out", icon: UserRound },
  "org_member.insert": { label: "Added an organisation member", icon: UserPlus },
  "org_member.update": { label: "Updated an organisation membership", icon: UserPlus },
  "org_member.delete": { label: "Removed an organisation member", icon: UserPlus },
};

interface ActivityTargets {
  institutions: ReadonlyMap<string, Institution>;
  watchlists: ReadonlyMap<string, string>;
}

function activityTarget(item: ActivityItem, { institutions, watchlists }: ActivityTargets) {
  if (item.event_type === "page_viewed") {
    const path = item.page_path ?? "";
    if (Object.prototype.hasOwnProperty.call(pages, path)) return { subject: pages[path], href: path };
    const slug = path.match(/^\/institution\/([^/]+)\/?$/)?.[1];
    const institution = slug ? institutions.get(slug) : undefined;
    if (institution) return { subject: institution.name, href: `/institution/${encodeURIComponent(institution.slug)}` };
    return { subject: path.startsWith("/release/") ? "a release page" : "a page" };
  }
  if (item.target_type === "institution") {
    const institution = institutions.get(item.target_id ?? "");
    return institution
      ? { subject: institution.name, href: `/institution/${encodeURIComponent(institution.slug)}` }
      : { subject: item.target_id || "an institution" };
  }
  const watchlist = watchlists.get(item.watchlist_id ?? "");
  if (item.target_type === "watchlist") {
    return watchlist ? { subject: watchlist, href: `/watchlist/${item.watchlist_id}` } : { subject: "a watchlist" };
  }
  if (item.release_id) {
    const release = item.releaseHeading;
    const href = release ? `/release/${item.release_id}${item.target_type === "comment" ? "#comments" : ""}` : undefined;
    const listPrepositions: Record<string, string> = {
      "watchlist_item.insert": "to",
      "watchlist_item.update": "in",
      "watchlist_item.delete": "from",
    };
    const context = item.target_type === "watchlist_item"
      ? `${listPrepositions[item.event_type] ?? "in"} ${watchlist ?? "a watchlist"}`
      : item.reaction && `(${item.reaction})`;
    return { subject: release ?? "a release", href, context };
  }
  return {};
}

function ActivityRow({ item, targets }: { item: ActivityItem; targets: ActivityTargets }) {
  const detail = Object.prototype.hasOwnProperty.call(actions, item.event_type)
    ? actions[item.event_type as keyof typeof actions]
    : { label: item.event_type.replace(/[._-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase()), icon: Activity };
  const Icon = detail.icon;
  const target = activityTarget(item, targets);
  const content = (
    <>
      <span style={{ width: 30, height: 30, borderRadius: 999, background: "var(--surface-3)", color: "var(--blue)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <span style={{ fontSize: 13.5, minWidth: 0, flex: 1, overflowWrap: "anywhere" }}>
        {detail.label}{target.subject && <> <strong>{target.subject}</strong></>}
        {target.context && <span style={{ color: "var(--text-muted)" }}> {target.context}</span>}
      </span>
      <time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()} style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
        {relativeTime(Date.parse(item.created_at))}
      </time>
    </>
  );
  const style = { display: "flex", alignItems: "center", gap: 10, padding: "11px 12px" };
  return (
    <li>
      {target.href ? <Link to={target.href} style={style}>{content}</Link> : <div style={style}>{content}</div>}
    </li>
  );
}

export function ProfileActivity({ institutions, watchlists }: {
  institutions: readonly Institution[];
  watchlists: readonly { id: string; name: string }[];
}) {
  const { items, loading, error, hasMore, loadMore, retry } = useActivity();
  const targets = {
    institutions: new Map(institutions.map((entry) => [entry.slug, entry])),
    watchlists: new Map(watchlists.map((entry) => [entry.id, entry.name])),
  };
  return (
    <section aria-labelledby="profile-activity-title">
      <h2 id="profile-activity-title" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Activity history</h2>
      {items.length > 0 && (
        <ol className="pp-card pp-divided-list" style={{ padding: 6, listStyle: "none" }}>
          {items.map((item) => <ActivityRow key={item.id} item={item} targets={targets} />)}
        </ol>
      )}
      {loading && <p role="status" style={{ padding: 18, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>Loading activity…</p>}
      {error && (
        <div style={{ padding: 18, textAlign: "center" }}>
          <p role="alert" style={{ fontSize: 13.5, marginBottom: 10 }}>Couldn't load activity.</p>
          <button type="button" className="pp-btn pp-btn-outline" onClick={retry}>Try again</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="pp-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13.5 }}>No activity yet.</p>
      )}
      {!loading && !error && hasMore && (
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <button type="button" className="pp-btn pp-btn-outline" onClick={loadMore}>Load older activity</button>
        </div>
      )}
    </section>
  );
}
