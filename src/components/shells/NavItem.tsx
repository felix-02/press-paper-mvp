import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const base: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "9px 11px",
  borderRadius: "var(--r-sm)",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1,
  transition: "background 0.14s ease, color 0.14s ease",
};

/** Active-aware navigation row backed by the router. */
export function NavItem({
  to,
  icon,
  label,
  end,
  trailing,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <NavLink to={to} end={end} style={{ display: "block" }}>
      {({ isActive }) => (
        <div
          style={{
            ...base,
            background: isActive ? "var(--surface-3)" : "transparent",
            color: isActive ? "var(--text)" : "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.background = "var(--surface-2)";
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.background = "transparent";
          }}
        >
          <span style={{ display: "grid", placeItems: "center", color: isActive ? "var(--text)" : "var(--text-muted)" }}>
            {icon}
          </span>
          <span style={{ flex: 1 }}>{label}</span>
          {trailing}
        </div>
      )}
    </NavLink>
  );
}

/** Small uppercase caption above a sidebar group. */
export function SidebarCaption({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0",
        textTransform: "uppercase",
        color: "var(--text-faint)",
        padding: "0 11px",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}
