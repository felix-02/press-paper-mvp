import {
  LayoutDashboard,
  PenSquare,
  FileText,
  BarChart3,
  Users,
  UserCog,
  Building2,
  Settings,
  LifeBuoy,
} from "lucide-react";
import { NavItem, SidebarCaption } from "./NavItem";
import { useInstitutionStats } from "@/lib/useInstitutionStats";

export function SidebarInstitution() {
  const ic = 18;
  const stats = useInstitutionStats();
  const live = stats.live && stats.loaded && !stats.error;
  const PUBLISHING_STATUS: { label: string; value: string; color?: string }[] = !live
    ? [
        { label: "Drafts", value: "—" },
        { label: "Scheduled", value: "—" },
        { label: "Published", value: "—" },
        { label: "Total Releases", value: "—" },
      ]
    : [
        { label: "Drafts", value: String(stats.draftCount) },
        { label: "Scheduled", value: String(stats.scheduledCount) },
        { label: "Published", value: String(stats.publishedCount), color: "var(--green)" },
        { label: "Total Releases", value: String(stats.releaseCount) },
      ];
  return (
    <aside
      className="pp-sidebar pp-sidebar-shell"
      aria-label="Institution workspace"
      style={{
        width: "var(--sidebar-w)",
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        background: "var(--sidebar-bg)",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        padding: "16px 12px 14px",
      }}
    >
      <nav className="pp-sidebar-nav" aria-label="Institution navigation" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <NavItem to="/inst" end icon={<LayoutDashboard size={ic} />} label="Dashboard" />
        <NavItem to="/inst/publish" icon={<PenSquare size={ic} />} label="Publish" />
        <NavItem to="/inst/releases" icon={<FileText size={ic} />} label="Releases" />
        <NavItem to="/inst/analytics" icon={<BarChart3 size={ic} />} label="Analytics" />
        <NavItem to="/inst/audience" icon={<Users size={ic} />} label="Audience" />
        <NavItem to="/inst/profile" icon={<Building2 size={ic} />} label="Profile" />
        <NavItem to="/inst/team" icon={<UserCog size={ic} />} label="Team" />
        <NavItem to="/inst/settings" icon={<Settings size={ic} />} label="Settings" />
      </nav>

      <div style={{ height: 1, background: "var(--border)", margin: "16px 4px" }} />

      <SidebarCaption>Publishing Status</SidebarCaption>
      <div className="pp-sidebar-status" style={{ display: "flex", flexDirection: "column", gap: 9, padding: "0 11px" }}>
        {PUBLISHING_STATUS.map((s) => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: s.color ?? "var(--text)" }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <NavItem to="/help" icon={<LifeBuoy size={18} />} label="Help Centre" />
      </div>
    </aside>
  );
}
