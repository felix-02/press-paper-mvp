import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, AlertCircle, MailCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PasswordInput } from "@/components/common/PasswordInput";
import { PrelaunchGlobe } from "@/components/landing/PrelaunchGlobe";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { safeRedirectTarget } from "@/lib/redirect";

export function Login() {
  const { ready, user, profile, profileReady, signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeRedirectTarget(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!ready || !profileReady || !user || !profile) return;
    navigate(next ?? (profile.is_admin ? "/admin" : profile.role === "institution" ? "/inst" : "/home"), { replace: true });
  }, [ready, profileReady, user, profile, next, navigate]);

  // LIVE: real Supabase sign-in.
  const submit = async () => {
    if (loading) return;
    setError(null);
    if (!email.trim() || email.trim().length > 320 || !password || password.length > 128) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error: err, role, isAdmin } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(next ?? (isAdmin ? "/admin" : role === "institution" ? "/inst" : "/home"), { replace: true });
  };

  const requestReset = async () => {
    const address = email.trim();
    setError(null);
    setResetSent(false);
    if (!address || address.length > 320) {
      setError("Enter your email address first.");
      return;
    }
    if (!supabase) return;
    setResetting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    if (resetError) {
      setError("We couldn't send the reset email. Please try again.");
      return;
    }
    setResetSent(true);
  };

  return (
    <div className="pp-login-page">
      <div className="pp-login-globe">
        <PrelaunchGlobe size={440} decorative />
      </div>

      <div style={{ position: "absolute", top: 28, left: 28 }}>
        <Logo size={20} to="/" />
      </div>

      <div
        className="pp-login-card"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 408,
          background: "var(--surface-public)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          padding: 34,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h1 style={{ fontSize: 27, fontWeight: 700, letterSpacing: "0", textAlign: "center" }}>Welcome Back</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", marginTop: 8 }}>
          Log in to your Presspaper account.
        </p>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 13,
              color: "var(--red)",
              background: "rgba(142, 142, 142, 0.1)",
              border: "1px solid rgba(142, 142, 142, 0.25)",
              borderRadius: "var(--r-sm)",
              padding: "10px 12px",
              marginTop: 18,
            }}
          >
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {resetSent && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--green)", background: "rgba(173, 173, 173, 0.1)", border: "1px solid rgba(173, 173, 173, 0.25)", borderRadius: "var(--r-sm)", padding: "10px 12px", marginTop: 18 }}>
            <MailCheck size={15} /> If an account exists for that address, a reset link is on its way.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Email</span>
            <input
              className="pp-input"
              type="email"
              autoComplete="email"
              maxLength={320}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </label>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Password</span>
              <button type="button" onClick={() => void requestReset()} disabled={resetting} style={{ fontSize: 12.5, color: "var(--blue)", opacity: resetting ? 0.7 : 1 }}>
                {resetting ? "Sending…" : "Forgot password?"}
              </button>
            </div>
            <PasswordInput
              className="pp-input"
              autoComplete="current-password"
              maxLength={128}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
        </div>

        <button
          className="pp-btn pp-btn-primary"
          style={{ width: "100%", marginTop: 22, padding: "12px", opacity: loading ? 0.7 : 1 }}
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Logging in…" : "Log In"} <ArrowRight size={16} />
        </button>

        <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", marginTop: 20 }}>
          New to Presspaper?{" "}
          <Link to={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} style={{ color: "var(--blue)", fontWeight: 500 }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
