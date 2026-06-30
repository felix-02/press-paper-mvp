import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LifeBuoy, Mail, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { useAuth } from "@/auth/AuthProvider";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Presspaper?",
    a: "Presspaper is a home for verified public information. Official institutions — governments, agencies, regulators, universities — publish their announcements, publications and data directly, and individuals can read, save, follow and get plain-language AI summaries of those official releases.",
  },
  {
    q: "How does institution verification work?",
    a: "Institutions prove they control their official domain using a DNS TXT record (the same method tools like Google Search Console use). Once the record is confirmed, the organisation receives a verified badge. Only the platform can grant verification after the DNS check passes — it can't be self-assigned.",
  },
  {
    q: "How do I publish a release?",
    a: "Sign in with an institution account, open the publishing studio from the sidebar, choose a release type, write your heading and body, and publish. Your release appears instantly in readers' feeds and on your public profile, and is included in search and the sitemap.",
  },
  {
    q: "Are AI summaries reliable?",
    a: "Summaries are generated from the official release text only and are meant to aid understanding, not replace the source. The full official release is always one tap away, and we encourage reading it for anything important.",
  },
  {
    q: "How do follows, saves and comments work?",
    a: "Follow institutions to get their new releases in your feed and notifications. Save any release to revisit later from your Saved tab. You can comment on releases and reply to other readers — all tied to your account.",
  },
  {
    q: "How is my data handled?",
    a: "Your account is protected by industry-standard authentication, and access to your data is governed by row-level security so you only ever see and change what's yours. We don't show ads or sell personal data.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pp-card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "16px 18px", fontSize: 15, fontWeight: 600 }}
      >
        {q}
        <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s", color: "var(--text-muted)", flexShrink: 0 }} />
      </button>
      {open && <p style={{ padding: "0 18px 18px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>{a}</p>}
    </div>
  );
}

export function Help() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const kind = profile?.role === "institution" ? "institution" : "individual";

  return (
    <AppShell kind={kind} maxWidth={760}>
      <button type="button" onClick={() => navigate(-1)} className="pp-link-muted" style={{ marginBottom: 16, fontSize: 13.5 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59,130,246,0.12)", display: "grid", placeItems: "center" }}>
          <LifeBuoy size={22} color="var(--blue)" />
        </span>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Help Centre</h1>
      </div>
      <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginBottom: 24 }}>
        Answers to common questions about using Presspaper.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FAQS.map((f) => (
          <FaqItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>

      <div className="pp-card" style={{ padding: 22, marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700 }}>Still need help?</div>
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 3 }}>Our team usually replies within one business day.</div>
        </div>
        <a href="mailto:support@presspaper.example" className="pp-btn pp-btn-primary">
          <Mail size={15} /> Contact support
        </a>
      </div>
    </AppShell>
  );
}
