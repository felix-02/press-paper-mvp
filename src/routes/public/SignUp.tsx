import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ArrowRight, AlertCircle, MailCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GlobeArt } from "@/components/brand/Illustrations";
import { useAuth } from "@/auth/AuthProvider";
import { isSensitiveRedirect, safeRedirectTarget } from "@/lib/redirect";


function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</span>
      <input className="pp-input" type={type} placeholder={placeholder} value={value} maxLength={maxLength} onChange={onChange ? (e) => onChange(e.target.value) : undefined} />
    </label>
  );
}

export function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeRedirectTarget(params.get("next"));
  const emailConfirmationNext = isSensitiveRedirect(next) ? null : next;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  const submit = async () => {
    if (loading) return;
    setError(null);
    if (!fullName.trim() || fullName.trim().length > 200 || !email.trim() || email.trim().length > 320 || password.length < 8 || password.length > 128) {
      setError("Add your name, email and a password of 8–128 characters.");
      return;
    }
    setLoading(true);
    const { error: err, needsConfirmation } = await signUp({
      email: email.trim(),
      password,
      role: "individual",
      fullName: fullName.trim(),
      emailRedirectTo: `${window.location.origin}/login${emailConfirmationNext ? `?next=${encodeURIComponent(emailConfirmationNext)}` : ""}`,
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsConfirmation) {
      setConfirmEmail(true);
      return;
    }
    navigate(next ?? "/home", { replace: true });
  };

  return (
    <div className="pp-auth-split" style={{ background: "#000", minHeight: "100vh", display: "flex" }}>
      {/* brand panel */}
      <div className="pp-auth-brand-panel" style={{ width: "44%", borderRight: "1px solid var(--border-faint)", padding: "40px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Logo size={20} to="/" />
        <div style={{ display: "grid", placeItems: "center", flex: 1 }}>
          <GlobeArt size={400} />
        </div>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0", lineHeight: 1.25 }}>
            Trusted public information,<br />in one place.
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 10, maxWidth: 360, lineHeight: 1.6 }}>
            Join citizens and institutions using Presspaper to share and read official information directly.
          </p>
        </div>
      </div>

      {/* form */}
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 28px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {confirmEmail ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, background: "rgba(59,130,246,0.12)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
                <MailCheck size={26} color="var(--blue)" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0" }}>Confirm your email</h1>
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6 }}>
                We've sent a confirmation link to <strong style={{ color: "var(--text)" }}>{email}</strong>. Click it, then log in.
              </p>
              {isSensitiveRedirect(next) && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10 }}>After confirming, return to this invitation tab to continue securely.</p>}
              <Link to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="pp-btn pp-btn-primary" style={{ marginTop: 24, padding: "11px 22px" }}>
                Go to log in <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0" }}>Let's Get Started</h1>
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginTop: 8 }}>Create your free account in seconds.</p>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--red)", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "var(--r-sm)", padding: "10px 12px", marginTop: 18 }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div style={{ marginTop: 22, marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12.5, color: "var(--text-secondary)", background: "var(--surface-2)", borderRadius: "var(--r-sm)", padding: "11px 13px", lineHeight: 1.5 }}>
                  <Building2 size={16} style={{ flexShrink: 0, marginTop: 1, opacity: 0.7 }} />
                  <span>Are you an organisation? Institution accounts are invite-only to protect against impersonation. <a href="mailto:hello@presspaper.ai?subject=Institution%20access%20request" style={{ color: "var(--blue)" }}>Request access</a> and we'll send an invite to your official email.</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Full name" placeholder="Your name" value={fullName} maxLength={200} onChange={setFullName} />
                <Field label="Email" type="email" placeholder="you@example.com" value={email} maxLength={320} onChange={setEmail} />
                <Field label="Password" type="password" placeholder="At least 8 characters" value={password} maxLength={128} onChange={setPassword} />
              </div>

              <button className="pp-btn pp-btn-primary" style={{ width: "100%", marginTop: 22, padding: "12px", opacity: loading ? 0.7 : 1 }} onClick={submit} disabled={loading}>
                {loading ? "Creating account…" : "Continue"} <ArrowRight size={16} />
              </button>

              <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", marginTop: 18 }}>
                Already have an account?{" "}
                <Link to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} style={{ color: "var(--blue)", fontWeight: 500 }}>Log in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
