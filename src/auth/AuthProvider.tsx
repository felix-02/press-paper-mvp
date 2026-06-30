import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import { identifyUser, resetAnalytics, track } from "@/lib/analytics";

export type Role = "individual" | "institution";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  institution_slug: string | null;
  institution_name: string | null;
  bio?: string | null;
  verification_status?: "unverified" | "pending" | "verified" | "rejected";
  verification_token?: string | null;
  verification_domain?: string | null;
  verified_at?: string | null;
  is_admin?: boolean;
  onboarding_complete?: boolean;
  org_website?: string | null;
  org_location?: string | null;
  org_description?: string | null;
  org_category?: string | null;
}

interface SignUpArgs {
  email: string;
  password: string;
  role: Role;
  fullName: string;
  institutionName?: string;
}

interface AuthValue {
  /** true when Supabase env vars are present (LIVE mode). */
  configured: boolean;
  /** true once the initial session check has finished. */
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  signUp: (args: SignUpArgs) => Promise<{ error: string | null; needsConfirmation: boolean; role: Role | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: Role | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "institution"
  );
}

async function fetchRole(userId: string): Promise<Role | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as Role) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // In demo mode there is no async session to wait for, so we're ready immediately.
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Initial session + auth state subscription.
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, role, full_name, institution_slug, institution_name, bio, verification_status, verification_token, verification_domain, verified_at, is_admin, onboarding_complete, org_website, org_location, org_description, org_category"
      )
      .eq("id", uid)
      .maybeSingle();
    const p = (data as Profile) ?? null;
    setProfile(p);
    if (p) identifyUser(p.id, { role: p.role, institution: p.institution_name ?? undefined });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  // Load the profile (role + institution) whenever the user changes.
  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null);
      return;
    }
    void loadProfile(user.id);
  }, [user, loadProfile]);

  // Hydrate the in-memory store (saved + followed) from the database so the rest
  // of the app — which reads the store — reflects this user's real data.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const store = useAppStore.getState();
    if (!user) {
      store.setUserId(null);
      store.hydrate({ saved: [], followed: [] });
      return;
    }
    let active = true;
    store.setUserId(user.id);
    Promise.all([
      supabase.from("saved_releases").select("release_id").eq("user_id", user.id),
      supabase.from("follows").select("institution_slug").eq("follower", user.id),
    ]).then(([s, f]) => {
      if (!active) return;
      const saved = ((s.data as { release_id: string }[] | null) ?? []).map((r) => r.release_id);
      const followed = ((f.data as { institution_slug: string }[] | null) ?? []).map((r) => r.institution_slug);
      useAppStore.getState().hydrate({ saved, followed });
    });
    return () => {
      active = false;
    };
  }, [user]);

  const signUp: AuthValue["signUp"] = async ({ email, password, role, fullName, institutionName }) => {
    if (!supabase) return { error: "Supabase is not configured.", needsConfirmation: false, role: null };
    const institution_name = role === "institution" ? institutionName || fullName : null;
    const institution_slug = role === "institution" ? slugify(institution_name || "institution") : null;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: fullName, institution_name, institution_slug } },
    });
    if (error) return { error: error.message, needsConfirmation: false, role: null };

    // Supabase returns a user with an empty identities array when the email is
    // already registered (enumeration protection). Surface that as a real error
    // so the same email can't appear to sign up twice.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: "An account with this email already exists. Try logging in instead.", needsConfirmation: false, role: null };
    }

    // If email confirmation is enabled, there is no session yet.
    const needsConfirmation = !data.session;
    track("signed_up", { role });
    return { error: null, needsConfirmation, role };
  };

  const signIn: AuthValue["signIn"] = async (email, password) => {
    if (!supabase) return { error: "Supabase is not configured.", role: null };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, role: null };
    const role = data.user ? await fetchRole(data.user.id) : null;
    track("logged_in", { role });
    return { error: null, role };
  };

  const signOut: AuthValue["signOut"] = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    resetAnalytics();
  };

  const value: AuthValue = {
    configured: isSupabaseConfigured,
    ready,
    user,
    profile,
    role: profile?.role ?? null,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
}
