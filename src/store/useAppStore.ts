import { create } from "zustand";
import type { Release } from "@/types";
import { HERO_RELEASE_ID, SAVED_RELEASES } from "@/data/releases";
import { FOLLOWED_SLUGS } from "@/data/institutions";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { track } from "@/lib/analytics";

// -----------------------------------------------------------------------------
// Session store.
//
// In DEMO mode (no Supabase) the saved/followed sets are seeded so the app is
// lively offline, and toggles stay in memory.
//
// In LIVE mode the sets are HYDRATED from Postgres on login and every toggle is
// written back to the `saved_releases` / `follows` tables, so saves and follows
// persist across sessions and devices. The UI reads these sets, so the sidebar,
// profile, counts and buttons everywhere reflect the real data.
// -----------------------------------------------------------------------------

export type Identity = "institution" | "individual" | null;

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: "success" | "info";
}

interface AppState {
  identity: Identity;
  enterAs: (id: Exclude<Identity, null>) => void;
  reset: () => void;

  // live-session binding
  userId: string | null;
  setUserId: (id: string | null) => void;
  hydrate: (data: { saved: string[]; followed: string[] }) => void;

  // FLOW A — releases published during a DEMO session (live mode uses the DB)
  publishedReleases: Release[];
  publishRelease: (r: Release) => void;

  // saved + followed
  savedIds: Set<string>;
  toggleSaved: (id: string) => boolean;
  isSaved: (id: string) => boolean;

  followedSlugs: Set<string>;
  toggleFollow: (slug: string) => boolean;
  isFollowing: (slug: string) => boolean;

  // toasts
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;

  // watchlists (shared so the sidebar + saved page stay in sync)
  watchlists: { id: string; name: string; count: number }[];
  watchlistItems: Record<string, string[]>;
  setWatchlistData: (lists: { id: string; name: string; count: number }[], items: Record<string, string[]>) => void;
}

let toastSeq = 1;

// Seeds are only used in DEMO mode (no backend).
const seededSaved = new Set<string>([HERO_RELEASE_ID, ...SAVED_RELEASES.map((r) => r.id)]);
const seededFollowed = new Set<string>(FOLLOWED_SLUGS);

const initialSaved = () => (isSupabaseConfigured ? new Set<string>() : new Set(seededSaved));
const initialFollowed = () => (isSupabaseConfigured ? new Set<string>() : new Set(seededFollowed));

export const useAppStore = create<AppState>((set, get) => ({
  identity: null,
  enterAs: (id) => set({ identity: id }),
  reset: () =>
    set({
      identity: null,
      publishedReleases: [],
      savedIds: initialSaved(),
      followedSlugs: initialFollowed(),
    }),

  userId: null,
  setUserId: (id) => set({ userId: id }),
  hydrate: ({ saved, followed }) =>
    set({ savedIds: new Set(saved), followedSlugs: new Set(followed) }),

  publishedReleases: [],
  publishRelease: (r) => set((s) => ({ publishedReleases: [r, ...s.publishedReleases] })),

  savedIds: initialSaved(),
  toggleSaved: (id) => {
    const next = new Set(get().savedIds);
    const nowSaved = !next.has(id);
    if (nowSaved) next.add(id);
    else next.delete(id);
    set({ savedIds: next });
    track(nowSaved ? "release_saved" : "release_unsaved", { releaseId: id });

    const uid = get().userId;
    if (isSupabaseConfigured && supabase && uid) {
      if (nowSaved) {
        void supabase.from("saved_releases").upsert({ user_id: uid, release_id: id }).then(noop, noop);
      } else {
        void supabase.from("saved_releases").delete().eq("user_id", uid).eq("release_id", id).then(noop, noop);
      }
    }
    return nowSaved;
  },
  isSaved: (id) => get().savedIds.has(id),

  followedSlugs: initialFollowed(),
  toggleFollow: (slug) => {
    const next = new Set(get().followedSlugs);
    const nowFollowing = !next.has(slug);
    if (nowFollowing) next.add(slug);
    else next.delete(slug);
    set({ followedSlugs: next });
    track(nowFollowing ? "institution_followed" : "institution_unfollowed", { slug });

    const uid = get().userId;
    if (isSupabaseConfigured && supabase && uid) {
      if (nowFollowing) {
        void supabase.from("follows").upsert({ follower: uid, institution_slug: slug }).then(noop, noop);
      } else {
        void supabase.from("follows").delete().eq("follower", uid).eq("institution_slug", slug).then(noop, noop);
      }
    }
    return nowFollowing;
  },
  isFollowing: (slug) => get().followedSlugs.has(slug),

  toasts: [],
  pushToast: (t) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    window.setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  watchlists: [],
  watchlistItems: {},
  setWatchlistData: (watchlists, watchlistItems) => set({ watchlists, watchlistItems }),
}));

function noop() {
  /* fire-and-forget DB writes; UI already updated optimistically */
}
