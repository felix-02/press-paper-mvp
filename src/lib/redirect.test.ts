import { describe, expect, it } from "vitest";
import { isSensitiveRedirect, loginRedirectTarget, safeRedirectTarget, withNext } from "./redirect";

describe("safeRedirectTarget", () => {
  it("accepts same-origin application paths", () => {
    expect(safeRedirectTarget("/release/abc?tab=about#comments")).toBe("/release/abc?tab=about#comments");
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example/path",
    "javascript:alert(1)",
    "login",
  ])("rejects unsafe target %s", (target) => {
    expect(safeRedirectTarget(target)).toBeNull();
  });

  it("encodes nested redirect parameters", () => {
    expect(withNext("/login", "/join/a?x=1")).toBe("/login?next=%2Fjoin%2Fa%3Fx%3D1");
  });

  it("identifies bearer-token invitation routes", () => {
    expect(isSensitiveRedirect("/join/secret-token")).toBe(true);
    expect(isSensitiveRedirect("/institution-invite/secret-token")).toBe(true);
    expect(isSensitiveRedirect("/release/public-id")).toBe(false);
  });
});

describe("shared login redirects", () => {
  it("routes each account to its own home", () => {
    expect(loginRedirectTarget("individual", false, null)).toBe("/home");
    expect(loginRedirectTarget("institution", false, null)).toBe("/inst");
    expect(loginRedirectTarget("individual", true, null)).toBe("/admin");
    expect(loginRedirectTarget("institution", true, null)).toBe("/admin");
  });

  it("keeps platform admins in the console even when login follows another page", () => {
    expect(loginRedirectTarget("individual", true, "/saved")).toBe("/admin");
    expect(loginRedirectTarget("institution", true, "/inst/profile")).toBe("/admin");
    expect(loginRedirectTarget("individual", true, "/admin?tab=users")).toBe("/admin?tab=users");
  });

  it("preserves safe return paths for readers and institutions", () => {
    expect(loginRedirectTarget("individual", false, "/release/abc#comments")).toBe("/release/abc#comments");
    expect(loginRedirectTarget("institution", false, "/inst/releases?status=Draft")).toBe("/inst/releases?status=Draft");
    expect(loginRedirectTarget("individual", false, "/join/invitation")).toBe("/join/invitation");
  });

  it.each(["/login", "/login/?next=%2Fadmin", "/admin/login", "/admin/login#form", "https://evil.example"])("avoids login loops and unsafe targets: %s", (target) => {
    expect(loginRedirectTarget("individual", false, target)).toBe("/home");
    expect(loginRedirectTarget("institution", false, target)).toBe("/inst");
  });
});
