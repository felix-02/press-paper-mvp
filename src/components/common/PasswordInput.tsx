import { useState, type ComponentPropsWithoutRef } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const action = visible ? "Hide password" : "Show password";

  return (
    <span className="pp-password-input-wrap">
      <input
        {...props}
        className={className}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className="pp-password-visibility"
        aria-label={action}
        aria-pressed={visible}
        title={action}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </span>
  );
}
