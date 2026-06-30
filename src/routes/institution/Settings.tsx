import { useState } from "react";
import { Settings as SettingsIcon, LogOut, Building2 } from "lucide-react";
import { AppShell } from "@/components/shells/AppShell";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";

export function InstitutionSettings() {
  const { profile, user, signOut, refreshProfile, configured } = useAuth();
  const pushToast = useAppStore((s) => s.pushToast);
  const [name, setName] = useState(profile?.institution_name ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    if (configured && supabase && user) {
      const { error } = await supabase.from("profiles").update({ institution_name: n }).eq("id", user.id);
      if (error) {
        setSaving(false);
        pushToast({ title: "Couldn't save", description: error.message, variant: "info" });
        return;
      }
      await refreshProfile();
    }
    setSaving(false);
    pushToast({ title: "Settings saved", variant: "success" });
  };

  return (
    <AppShell kind="institution" maxWidth={720}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
          <SettingsIcon size={22} color="var(--text-secondary)" />
        </span>
        <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em" }}>Settings</h1>
      </div>

      <section className="pp-card" style={{ padding: 22, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={17} /> Organisation
        </h2>
        <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>Organisation name</label>
        <input className="pp-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welsh Government" />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="pp-btn pp-btn-primary" disabled={saving || !name.trim()} onClick={save} style={{ opacity: saving || !name.trim() ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      <section className="pp-card" style={{ padding: 22, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 14 }}>Account</h2>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 10, columnGap: 18, fontSize: 14 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Signed in as</span>
          <span>{user?.email ?? "—"}</span>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Account type</span>
          <span>Institution</span>
        </div>
      </section>

      <button type="button" className="pp-btn pp-btn-outline" onClick={signOut}>
        <LogOut size={15} /> Sign out
      </button>
    </AppShell>
  );
}
