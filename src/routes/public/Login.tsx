import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GlobeArt } from "@/components/brand/Illustrations";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/auth/AuthProvider";

export function Login() {
  const { configured, signIn } = useAuth();
  const enterAs = useAppStore((s) => s.enterAs);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // LIVE: real Supabase sign-in.
  const submit = async () => {
    if (loading) return;
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error: err, role } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(role === "institution" ? "/inst" : "/home");
  };

  // DEMO: no backend — enter either experience directly.
  const demoEnter = (as: "individual" | "institution") => {
    enterAs(as);
    navigate(as === "institution" ? "/inst" : "/home");
  };

  return (
    <div style={{ background: "#000", minHeight: "100vh", position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
      <div style={{ position: "absolute", left: -160, top: "50%", transform: "translateY(-50%)", opacity: 0.5, pointerEvents: "none" }}>
        <GlobeArt size={520} />
      </div>
      <div style={{ position: "absolute", right: -180, top: "42%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }}>
        <GlobeArt size={440} />
      </div>

      <div style={{ position: "absolute", top: 28, left: 28 }}>
        <Logo size={20} to="/" />
      </div>

      <div
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
        <h1 style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em", textAlign: "center" }}>Welcome Back</h1>
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
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "var(--r-sm)",
              padding: "10px 12px",
              marginTop: 18,
            }}
          >
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Email</span>
            <input
              className="pp-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && configured && submit()}
            />
          </label>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Password</span>
              <button type="button" onClick={(e) => e.preventDefault()} style={{ fontSize: 12.5, color: "var(--blue)" }}>
                Forgot password?
              </button>
            </div>
            <input
              className="pp-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && configured && submit()}
            />
          </div>
        </div>

        {configured ? (
          <button
            className="pp-btn pp-btn-primary"
            style={{ width: "100%", marginTop: 22, padding: "12px", opacity: loading ? 0.7 : 1 }}
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Logging in…" : "Log In"} <ArrowRight size={16} />
          </button>
        ) : (
          <>
            <button className="pp-btn pp-btn-primary" style={{ width: "100%", marginTop: 22, padding: "12px" }} onClick={() => demoEnter("individual")}>
              Log In <ArrowRight size={16} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
              <div className="pp-divider" />
              <span style={{ fontSize: 12, color: "var(--text-faint)", whiteSpace: "nowrap" }}>or</span>
              <div className="pp-divider" />
            </div>
            <button className="pp-btn pp-btn-ghost" style={{ width: "100%", padding: "11px" }} onClick={() => demoEnter("institution")}>
              Sign in as an institution
            </button>
          </>
        )}

        <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", marginTop: 20 }}>
          New to Presspaper?{" "}
          <Link to="/signup" style={{ color: "var(--blue)", fontWeight: 500 }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
