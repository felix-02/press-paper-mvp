import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Globe, FileText, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";

const CATEGORIES = ["Government", "Regulator / Agency", "Central Bank", "University", "Local Authority", "International Organisation", "Other"];

export function InstitutionOnboarding() {
  const { profile, user, refreshProfile, configured, signOut } = useAuth();
  const pushToast = useAppStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.institution_name ?? "");
  const [category, setCategory] = useState(profile?.org_category ?? "");
  const [website, setWebsite] = useState(profile?.org_website ?? "");
  const [location, setLocation] = useState(profile?.org_location ?? "");
  const [description, setDescription] = useState(profile?.org_description ?? "");
  const [saving, setSaving] = useState(false);

  const steps = ["Organisation", "Details", "About"];
  const canNext = step === 0 ? name.trim() && category : step === 1 ? website.trim() : true;

  const finish = async () => {
    setSaving(true);
    if (configured && supabase && user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          institution_name: name.trim(),
          org_category: category,
          org_website: website.trim(),
          org_location: location.trim(),
          org_description: description.trim(),
          onboarding_complete: true,
        })
        .eq("id", user.id);
      if (error) {
        setSaving(false);
        pushToast({ title: "Couldn't save", description: error.message, variant: "info" });
        return;
      }
      await refreshProfile();
    }
    setSaving(false);
    pushToast({ title: "Welcome aboard!", description: "Your organisation is all set up.", variant: "success" });
    navigate("/inst", { replace: true });
  };

  const field: React.CSSProperties = { marginBottom: 16 };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 26px", borderBottom: "1px solid var(--border)" }}>
        <Logo />
        <button type="button" onClick={signOut} style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Sign out
        </button>
      </header>

      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>Set up your organisation</h1>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", marginTop: 6 }}>
              A few details so readers know who's publishing. You can edit these later in Settings.
            </p>
          </div>

          {/* stepper */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "22px 0" }}>
            {steps.map((s, idx) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: idx < step ? "var(--blue)" : idx === step ? "var(--surface-3)" : "var(--surface-2)",
                    color: idx <= step ? "#fff" : "var(--text-muted)",
                    border: idx === step ? "1px solid var(--blue)" : "1px solid transparent",
                  }}
                >
                  {idx < step ? <Check size={14} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && <div style={{ width: 34, height: 2, background: idx < step ? "var(--blue)" : "var(--border)" }} />}
              </div>
            ))}
          </div>

          <div className="pp-card" style={{ padding: 24 }}>
            {step === 0 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 size={17} /> Who are you?
                </h2>
                <div style={field}>
                  <label style={labelStyle}>Organisation name</label>
                  <input className="pp-input" value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Welsh Government" />
                </div>
                <div style={field}>
                  <label style={labelStyle}>Type of organisation</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        style={{
                          fontSize: 13,
                          padding: "7px 13px",
                          borderRadius: "var(--r-pill)",
                          border: `1px solid ${category === c ? "transparent" : "var(--border)"}`,
                          background: category === c ? "var(--surface-3)" : "transparent",
                          color: category === c ? "var(--text)" : "var(--text-secondary)",
                          fontWeight: category === c ? 600 : 500,
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Globe size={17} /> Where to find you
                </h2>
                <div style={field}>
                  <label style={labelStyle}>Official website</label>
                  <input className="pp-input" value={website} autoFocus onChange={(e) => setWebsite(e.target.value)} placeholder="gov.wales" />
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Used later to verify you control this domain.</p>
                </div>
                <div style={field}>
                  <label style={labelStyle}>Location</label>
                  <input className="pp-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cardiff, Wales, UK" />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={17} /> Tell readers about you
                </h2>
                <div style={field}>
                  <label style={labelStyle}>Short description</label>
                  <textarea
                    className="pp-input"
                    value={description}
                    autoFocus
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What your organisation does and the kind of releases you publish."
                    rows={4}
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="pp-btn pp-btn-ghost"
                style={{ visibility: step === 0 ? "hidden" : "visible" }}
              >
                <ArrowLeft size={15} /> Back
              </button>
              {step < steps.length - 1 ? (
                <button type="button" onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="pp-btn pp-btn-primary" style={{ opacity: canNext ? 1 : 0.6 }}>
                  Continue <ArrowRight size={15} />
                </button>
              ) : (
                <button type="button" onClick={finish} disabled={saving} className="pp-btn pp-btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Finishing…" : "Complete setup"} <Check size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
