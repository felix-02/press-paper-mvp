import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { track } from "@/lib/analytics";
import type { Comment } from "@/types";

interface CommentRow {
  id: string;
  release_id: string;
  parent_id: string | null;
  author: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface CommentNode extends Comment {
  parentId: string | null;
  replies: CommentNode[];
}

function rowToComment(r: CommentRow): CommentNode {
  return {
    id: r.id,
    parentId: r.parent_id,
    author: r.author_name || "Reader",
    role: "Reader",
    verified: false,
    body: r.body,
    time: relative(r.created_at),
    likes: 0,
    replies: [],
  };
}

function relative(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 45) return "Just now";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function buildTree(seed: Comment[], rows: CommentNode[]): { tree: CommentNode[]; total: number } {
  const seeds: CommentNode[] = seed.map((c) => ({ ...c, parentId: null, replies: [] }));
  const all = [...seeds, ...rows];
  const byId = new Map<string, CommentNode>();
  all.forEach((c) => byId.set(c.id, { ...c, replies: [] }));
  const roots: CommentNode[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.replies.push(node);
    else roots.push(node);
  });
  return { tree: roots, total: all.length };
}

/**
 * Threaded comments for a release. Posting works in both modes — it always
 * updates locally, and in LIVE mode persists to the `comments` table (with
 * parent_id for replies).
 */
export function useComments(releaseId: string, seed: Comment[]) {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<CommentNode[]>([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;
    supabase
      .from("comments")
      .select("*")
      .eq("release_id", releaseId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active && data) setRows((data as CommentRow[]).map(rowToComment));
      });
    return () => {
      active = false;
    };
  }, [releaseId]);

  const post = async (body: string, parentId?: string | null) => {
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    const name = profile?.full_name || "You";
    const localId = `local-${Date.now()}`;
    const optimistic: CommentNode = {
      id: localId,
      parentId: parentId ?? null,
      author: name,
      role: profile?.role === "institution" ? "Institution" : "Reader",
      verified: profile?.role === "institution",
      body: text,
      time: "Just now",
      likes: 0,
      replies: [],
    };
    setRows((r) => [...r, optimistic]);
    track("comment_posted", { releaseId, isReply: !!parentId });
    if (isSupabaseConfigured && supabase && user) {
      await supabase
        .from("comments")
        .insert({ release_id: releaseId, author: user.id, author_name: name, body: text, parent_id: parentId ?? null });
    }
    setPosting(false);
  };

  const { tree, total } = buildTree(seed, rows);
  return { tree, total, post, posting };
}
