import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { ToastHost } from "@/components/primitives/ToastHost";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { pageview } from "@/lib/analytics";
import { Help } from "@/routes/Help";
import { WatchlistView } from "@/routes/individual/WatchlistView";

// Public
import { Landing } from "@/routes/public/Landing";
import { SignUp } from "@/routes/public/SignUp";
import { Login } from "@/routes/public/Login";
import { ExploreSources } from "@/routes/public/ExploreSources";
import { ResetPassword } from "@/routes/public/ResetPassword";
import { AdminLogin } from "@/routes/public/AdminLogin";

// Individual
import { Home } from "@/routes/individual/Home";
import { Explore } from "@/routes/individual/Explore";
import { Saved } from "@/routes/individual/Saved";
import { Profile as IndividualProfile } from "@/routes/individual/Profile";
import { InstitutionPublic } from "@/routes/individual/InstitutionPublic";
import { FullRelease } from "@/routes/individual/FullRelease";

// Institution
import { Dashboard } from "@/routes/institution/Dashboard";
import { Publish } from "@/routes/institution/Publish";
import { Releases } from "@/routes/institution/Releases";
import { Analytics } from "@/routes/institution/Analytics";
import { Audience } from "@/routes/institution/Audience";
import { Profile as InstitutionProfile } from "@/routes/institution/Profile";
import { InstitutionSettings } from "@/routes/institution/Settings";
import { InstitutionOnboarding } from "@/routes/institution/Onboarding";
import { InstitutionTeam } from "@/routes/institution/Team";
import { PlatformAdmin } from "@/routes/admin/PlatformAdmin";
import { JoinOrg } from "@/routes/institution/Join";
import { InstitutionInvite } from "@/routes/institution/InstitutionInvite";
import { useAuth } from "@/auth/AuthProvider";
import { useOrg } from "@/lib/useOrg";
import { isReleaseUuid, releasePath } from "@/lib/releaseUrls";

/** Forces institution accounts through guided onboarding before anything else. */
function OnboardingGate() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!profile) return;
    const needsOnboarding = profile.role === "institution" && !profile.onboarding_complete;
    if (needsOnboarding && location.pathname.startsWith("/inst") && location.pathname !== "/inst/team") {
      navigate("/onboarding", { replace: true });
    }
  }, [profile, location.pathname, navigate]);
  return null;
}

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    pageview(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

/** Local/static-host fallback; Vercel serves production `/r/:id` via its API rewrite. */
function SharedReleaseFallback() {
  const { id = "" } = useParams();
  return <Navigate to={isReleaseUuid(id) ? releasePath(id) : "/"} replace />;
}

function ActiveInstitutionRoute({ children }: { children: React.ReactNode }) {
  const { configured } = useAuth();
  const org = useOrg();
  if (!configured) return <>{children}</>;
  if (org.loading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", color: "var(--text-muted)" }}>Checking organisation access…</div>;
  }
  if (org.error) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
        <div className="pp-card" role="alert" style={{ width: "100%", maxWidth: 460, padding: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 19, fontWeight: 700 }}>Organisation access unavailable</h1>
          <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 14 }}>{org.error}</p>
          <button type="button" className="pp-btn pp-btn-primary" onClick={() => void org.refresh()} style={{ marginTop: 18 }}>Try again</button>
        </div>
      </div>
    );
  }
  if (!org.active) return <Navigate to="/inst/team" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RouteTracker />
        <OnboardingGate />
        <Routes>
          {/* Public (pure-black marketing + auth) — open */}
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/sources" element={<ExploreSources />} />
          <Route path="/r/:id" element={<SharedReleaseFallback />} />

          {/* Individual — requires an individual session (LIVE mode) */}
          <Route path="/home" element={<ProtectedRoute role="individual"><Home /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute role="individual"><Explore /></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute role="individual"><Saved /></ProtectedRoute>} />
          <Route path="/me" element={<ProtectedRoute role="individual"><IndividualProfile /></ProtectedRoute>} />

          {/* Reader pages — any signed-in user */}
          <Route path="/institution/:slug" element={<InstitutionPublic />} />
          <Route path="/help" element={<Help />} />
          <Route path="/watchlist/:id" element={<ProtectedRoute><WatchlistView /></ProtectedRoute>} />
          <Route path="/release/:id" element={<ProtectedRoute><FullRelease /></ProtectedRoute>} />

          {/* Institution — requires an institution session (LIVE mode) */}
          <Route path="/inst" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><Dashboard /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/publish" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><Publish /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/publish/:id" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><Publish /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/releases" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><Releases /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/analytics" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><Analytics /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/audience" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><Audience /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/profile" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><InstitutionProfile /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/settings" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><InstitutionSettings /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/inst/team" element={<ProtectedRoute role="institution"><InstitutionTeam /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute admin><PlatformAdmin /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute role="institution"><ActiveInstitutionRoute><InstitutionOnboarding /></ActiveInstitutionRoute></ProtectedRoute>} />
          <Route path="/join/:token" element={<JoinOrg />} />
          <Route path="/institution-invite/:token" element={<InstitutionInvite />} />

          {/* Anything else returns to the public landing — never a dead end */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastHost />
      </BrowserRouter>
    </AuthProvider>
  );
}
