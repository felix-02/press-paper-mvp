export function safeRedirectTarget(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const base = new URL("https://presspaper.invalid/");
    const target = new URL(value, base);
    if (target.origin !== base.origin || !value.startsWith("/") || value.startsWith("//")) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

export function withNext(path: string, next: string): string {
  return `${path}?next=${encodeURIComponent(next)}`;
}

/** All accounts share one sign-in form; platform admins always enter their console. */
export function loginRedirectTarget(role: "individual" | "institution" | null, isAdmin: boolean, next: string | null): string {
  const target = safeRedirectTarget(next);
  const pathname = target?.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (isAdmin) return target && pathname === "/admin" ? target : "/admin";
  if (target && pathname !== "/login" && pathname !== "/admin/login") return target;
  return role === "institution" ? "/inst" : "/home";
}

export function isSensitiveRedirect(path: string | null): boolean {
  return !!path && (/^\/join\/[^/]+/i.test(path) || /^\/institution-invite\/[^/]+/i.test(path));
}
