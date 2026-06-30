import { useState } from "react";
import { MessageSquare, ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/brand/Avatar";
import { Verified } from "@/components/primitives/Bits";
import { useComments, type CommentNode } from "@/lib/useComments";
import { useAuth } from "@/auth/AuthProvider";
import type { Comment } from "@/types";

export function CommentThread({ releaseId, seed }: { releaseId: string; seed: Comment[] }) {
  const { profile } = useAuth();
  const { tree, post, posting } = useComments(releaseId, seed);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) =>
    setLiked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const submit = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await post(t);
  };

  const submitReply = async (parentId: string) => {
    const t = replyDraft.trim();
    if (!t) return;
    setReplyDraft("");
    setReplyTo(null);
    await post(t, parentId);
  };

  const renderNode = (c: CommentNode, depth: number) => {
    const isLiked = liked.has(c.id);
    const likeCount = c.likes + (isLiked ? 1 : 0);
    return (
      <div key={c.id} style={{ display: "flex", gap: 12, marginLeft: depth ? 44 : 0 }}>
        <Avatar name={c.author} size={depth ? 30 : 36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{c.author}</span>
            {c.verified && <Verified size={12} />}
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>· {c.role} · {c.time}</span>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 5 }}>{c.body}</p>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => toggleLike(c.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: isLiked ? "var(--blue)" : "var(--text-muted)", fontWeight: isLiked ? 600 : 400 }}
            >
              <ThumbsUp size={13} fill={isLiked ? "var(--blue)" : "none"} /> {likeCount > 0 ? likeCount : ""} Like
            </button>
            {depth === 0 && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(replyTo === c.id ? null : c.id);
                  setReplyDraft("");
                }}
                style={{ fontSize: 12.5, color: "var(--text-muted)" }}
              >
                Reply
              </button>
            )}
          </div>

          {replyTo === c.id && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <Avatar name={profile?.full_name ?? undefined} size={28} />
              <div style={{ flex: 1 }}>
                <textarea
                  className="pp-input"
                  placeholder={`Reply to ${c.author}…`}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  rows={2}
                  autoFocus
                  style={{ resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => setReplyTo(null)} className="pp-btn pp-btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitReply(c.id)}
                    disabled={posting || !replyDraft.trim()}
                    className="pp-btn pp-btn-blue"
                    style={{ padding: "6px 14px", fontSize: 12.5, opacity: posting || !replyDraft.trim() ? 0.6 : 1 }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {c.replies.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              {c.replies.map((r) => renderNode(r, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
        <Avatar name={profile?.full_name ?? undefined} size={36} />
        <div style={{ flex: 1 }}>
          <textarea
            className="pp-input"
            placeholder="Add a thoughtful comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={2}
            style={{ resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={submit}
              disabled={posting || !draft.trim()}
              className="pp-btn pp-btn-blue"
              style={{ padding: "7px 16px", fontSize: 13, opacity: posting || !draft.trim() ? 0.6 : 1 }}
            >
              {posting ? "Posting…" : "Comment"}
            </button>
          </div>
        </div>
      </div>

      {tree.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13.5 }}>
          <MessageSquare size={15} /> Be the first to comment on this release.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{tree.map((c) => renderNode(c, 0))}</div>
      )}
    </div>
  );
}
