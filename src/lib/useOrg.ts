import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";

export type OrgRole = "owner" | "admin" | "editor" | "viewer";

export interface OrgMember {
  user_id: string;
  role: OrgRole;
  status: "pending" | "active" | "declined";
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: OrgRole;
  token: string;
  status: string;
  created_at: string;
}

export function useOrg() {
  const { profile, user } = useAuth();
  const slug = profile?.institution_slug ?? null;
  const available = isSupabaseConfigured && !!supabase && profile?.role === "institution" && !!slug;

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [verified, setVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const me = members.find((m) => m.user_id === user?.id) ?? null;
  const role: OrgRole | null = me?.role ?? null;
  const status = me?.status ?? null;
  const active = status === "active";

  const can = {
    publish: active && (role === "owner" || role === "admin" || role === "editor"),
    invite: active && (role === "owner" || role === "admin"),
    approve: active && role === "owner",
    manage: active && (role === "owner" || role === "admin"),
  };

  const refresh = useCallback(async () => {
    if (!available || !supabase || !slug) {
      setMembers([]);
      setInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: mem } = await supabase.rpc("org_members_detail", { slug });
    setMembers((mem as OrgMember[] | null) ?? []);
    const { data: ver } = await supabase.rpc("org_is_verified", { slug });
    setVerified(ver === true);
    // Pending invites are only readable by owner/admin (RLS); others get nothing.
    const { data: inv } = await supabase.from("org_invites").select("id, email, role, token, status, created_at").eq("institution_slug", slug).eq("status", "pending").order("created_at", { ascending: false });
    setInvites((inv as OrgInvite[] | null) ?? []);
    setLoading(false);
  }, [available, slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createInvite = async (email: string, inviteRole: OrgRole): Promise<OrgInvite | null> => {
    if (!supabase || !slug || !user) return null;
    const { data } = await supabase
      .from("org_invites")
      .insert({ institution_slug: slug, email: email.trim().toLowerCase(), role: inviteRole, invited_by: user.id })
      .select("id, email, role, token, status, created_at")
      .single();
    await refresh();
    return (data as OrgInvite | null) ?? null;
  };

  const revokeInvite = async (id: string) => {
    if (!supabase) return;
    await supabase.from("org_invites").update({ status: "revoked" }).eq("id", id);
    await refresh();
  };

  const approve = async (target: string) => {
    if (!supabase || !slug) return;
    await supabase.rpc("set_member_status", { slug, target, new_status: "active" });
    await refresh();
  };

  const decline = async (target: string) => {
    if (!supabase || !slug) return;
    await supabase.rpc("set_member_status", { slug, target, new_status: "declined" });
    await refresh();
  };

  const setRole = async (target: string, newRole: OrgRole) => {
    if (!supabase || !slug) return;
    await supabase.rpc("set_member_role", { slug, target, new_role: newRole });
    await refresh();
  };

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  // 5-seat plan. Owner + active + pending invites all consume a seat.
  const SEAT_LIMIT = 5;
  const seatsUsed = members.filter((m) => m.status !== "declined").length + invites.length;
  const seatsLeft = Math.max(0, SEAT_LIMIT - seatsUsed);

  // Publishing additionally requires the org to have verified its domain.
  const canPublishNow = can.publish && verified;

  return { slug, role, status, active, verified, can, canPublishNow, members, activeMembers, pendingMembers, invites, loading, available, refresh, createInvite, revokeInvite, approve, decline, setRole, seatLimit: SEAT_LIMIT, seatsUsed, seatsLeft };
}
