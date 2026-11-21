import { afterEach, describe, expect, it, vi } from "vitest";
import { contentSecurityPolicy, esc, publicOrigin, safeJsonLd, validatedOrigin, xmlSafeText } from "./[id].js";

const originalPublicSiteUrl = process.env.PUBLIC_SITE_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (originalPublicSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL;
  else process.env.PUBLIC_SITE_URL = originalPublicSiteUrl;
});

describe("public release page helpers", () => {
  it("escapes HTML and JSON-LD script boundaries", () => {
    expect(esc('<img src=x onerror="x">')).toBe("&lt;img src=x onerror=&quot;x&quot;&gt;");
    expect(safeJsonLd({ value: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });

  it("converts rich HTML to inert article text", () => {
    expect(xmlSafeText("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
  });

  it("requires HTTPS for non-loopback configured origins", () => {
    expect(validatedOrigin("https://presspaper.example")).toBe("https://presspaper.example");
    expect(validatedOrigin("http://presspaper.example")).toBeNull();
    expect(validatedOrigin("https://user@presspaper.example")).toBeNull();
  });

  it("does not trust a production Host header", () => {
    delete process.env.PUBLIC_SITE_URL;
    expect(publicOrigin({ headers: { host: "evil.example", "x-forwarded-proto": "https" } })).toBe("https://presspaper.ai");
  });

  it("allows only the nonce-bearing metadata script", () => {
    expect(contentSecurityPolicy("abc123")).toContain("script-src 'nonce-abc123'");
  });

  it("renders the uploaded photo and refreshes the signed URL from the share preview", async () => {
    const id = "12345678-1234-4123-8123-123456789abc";
    const path = `example/${id}/12345678-1234-4123-8123-123456789abd.png`;
    const storagePath = `/object/sign/release-files/${path}`;
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-key");
    vi.stubEnv("PUBLIC_SITE_URL", "https://presspaper.example");
    vi.resetModules();
    const { default: handler } = await import("./[id].js");
    const release = {
      institution_slug: "example", heading: "Example release",
      extras: { files: [{ path, kind: "image", alt: "Uploaded cover" }] },
    };
    const fetch = vi.fn(async (url) => {
      if (url.pathname === "/rest/v1/releases") return Response.json([release]);
      if (url.pathname === "/rest/v1/rpc/org_is_verified") return Response.json(true);
      if (url.pathname === `/storage/v1${storagePath}`) return Response.json({ signedURL: `${storagePath}?token=example` });
      throw new Error(`Unexpected request to ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetch);
    const response = () => {
      const headers = new Map();
      const res = { headers, setHeader: (name, value) => headers.set(name, value), status: () => res, send: vi.fn(), end: vi.fn() };
      return res;
    };

    const page = response();
    await handler({ headers: {}, query: { id }, method: "GET" }, page);
    expect(page.send.mock.calls[0][0]).toContain('alt="Uploaded cover"');
    expect(page.send.mock.calls[0][0]).toContain(`property="og:image" content="https://presspaper.example/r/${id}?image=1"`);
    expect(page.headers.get("Content-Security-Policy")).toContain("https://example.supabase.co");

    const preview = response();
    await handler({ headers: {}, query: { id, image: "1" }, method: "GET" }, preview);
    expect(preview.headers.get("Location")).toBe(`https://example.supabase.co/storage/v1${storagePath}?token=example`);

    release.extras.files[0].path = path.replace("example/", "other/");
    const fallback = response();
    fetch.mockClear();
    await handler({ headers: {}, query: { id, image: "1" }, method: "GET" }, fallback);
    expect(fallback.headers.get("Location")).toBe("https://presspaper.example/og.png");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
