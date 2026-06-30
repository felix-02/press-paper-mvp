import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import { AdminReview } from "@/routes/institution/Admin";
import { JoinOrg } from "@/routes/institution/Join";
import { InstitutionInvite } from "@/routes/institution/InstitutionInvite";
import { useAuth } from "@/auth/AuthProvider";

/** Forces institution accounts through guided onboarding before anything else. */
function OnboardingGate() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!profile) return;
    const needsOnboarding = profile.role === "institution" && !profile.onboarding_complete;
    if (needsOnboarding && location.pathname !== "/onboarding") {
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteTracker />
        <OnboardingGate />
        <Routes>
          {/* Public (pure-black marketing + auth) — open */}
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sources" element={<ExploreSources />} />

          {/* Individual — requires an individual session (LIVE mode) */}
          <Route path="/home" element={<ProtectedRoute role="individual"><Home /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute role="individual"><Explore /></ProtectedRoute>} />
          <Route path="/saved" element={<ProtectedRoute role="individual"><Saved /></ProtectedRoute>} />
          <Route path="/me" element={<ProtectedRoute role="individual"><IndividualProfile /></ProtectedRoute>} />

          {/* Reader pages — any signed-in user */}
          <Route path="/institution/:slug" element={<ProtectedRoute><InstitutionPublic /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/watchlist/:id" element={<ProtectedRoute><WatchlistView /></ProtectedRoute>} />
          <Route path="/release/:id" element={<ProtectedRoute><FullRelease /></ProtectedRoute>} />

          {/* Institution — requires an institution session (LIVE mode) */}
          <Route path="/inst" element={<ProtectedRoute role="institution"><Dashboard /></ProtectedRoute>} />
          <Route path="/inst/publish" element={<ProtectedRoute role="institution"><Publish /></ProtectedRoute>} />
          <Route path="/inst/releases" element={<ProtectedRoute role="institution"><Releases /></ProtectedRoute>} />
          <Route path="/inst/analytics" element={<ProtectedRoute role="institution"><Analytics /></ProtectedRoute>} />
          <Route path="/inst/audience" element={<ProtectedRoute role="institution"><Audience /></ProtectedRoute>} />
          <Route path="/inst/profile" element={<ProtectedRoute role="institution"><InstitutionProfile /></ProtectedRoute>} />
          <Route path="/inst/settings" element={<ProtectedRoute role="institution"><InstitutionSettings /></ProtectedRoute>} />
          <Route path="/inst/team" element={<ProtectedRoute role="institution"><InstitutionTeam /></ProtectedRoute>} />
          <Route path="/inst/admin" element={<ProtectedRoute role="institution"><AdminReview /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute role="institution"><InstitutionOnboarding /></ProtectedRoute>} />
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
