import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

/** Shared, centered frame for login and sign-up. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pp-auth-page">
      <div className="pp-auth-logo">
        <Logo size={20} to="/" />
      </div>
      <main className="pp-auth-content">{children}</main>
    </div>
  );
}

/** Labelled text input for auth forms. */
export function AuthField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  maxLength,
  autoComplete,
  autoFocus,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</span>
      <input
        className="pp-input"
        type={type}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField({
  label = "Password",
  placeholder,
  value,
  onChange,
  autoComplete,
  labelEnd,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  labelEnd?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const action = visible ? "Hide password" : "Show password";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label htmlFor={inputId} style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</label>
        {labelEnd}
      </div>
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          className="pp-input"
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          maxLength={128}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 42 }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={action}
          aria-pressed={visible}
          title={action}
          style={{ position: "absolute", top: 0, bottom: 0, right: 6, display: "grid", placeItems: "center", width: 32, color: "var(--text-muted)" }}
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
