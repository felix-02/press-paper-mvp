import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type Role } from "./AuthProvider";

function FullScreenLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          border: "3px solid var(--surface-3)",
          borderTopColor: "var(--blue)",
          animation: "pp-spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}

/**
 * Guards a route. In DEMO mode (no Supabase) it is a pass-through, preserving the
 * "presenter starts logged in" behaviour. In LIVE mode it requires a session and,
 * optionally, a specific role — redirecting to login or the correct home.
 */
export function ProtectedRoute({ children, role }: { children: ReactNode; role?: Role }) {
  const { configured, ready, user, profile } = useAuth();

  if (!configured) return <>{children}</>;
  if (!ready) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  // A role is required but the profile hasn't loaded yet — wait rather than flash.
  if (role && !profile) return <FullScreenLoader />;

  if (role && profile && profile.role !== role) {
    return <Navigate to={profile.role === "institution" ? "/inst" : "/home"} replace />;
  }

  return <>{children}</>;
}
