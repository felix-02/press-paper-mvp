import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Read at build time. When both are present the app runs in LIVE mode (real auth
// + Postgres). When absent it falls back to DEMO mode (in-memory, offline) so the
// single-file pitch build keeps working with no backend.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true, // keeps the session across refreshes (localStorage)
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Shape of a row in public.releases (kept loose on purpose).
export interface ReleaseRow {
  id: string;
  owner: string;
  institution_slug: string;
  institution_name: string | null;
  type: string;
  status: "Published" | "Draft" | "Scheduled";
  heading: string;
  subheading: string | null;
  body: string | null;
  scene: string;
  published_at: string | null;
  created_at: string;
  views?: number;
  comments_count?: number;
}
