// Server-rendered public release page for SEO and rich link sharing.

import { randomBytes } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const DEFAULT_PUBLIC_ORIGIN = "https://presspaper.ai";
const FETCH_TIMEOUT_MS = 5_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function contentSecurityPolicy(nonce = "", imageOrigin = "") {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "connect-src 'none'",
    "font-src 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    ["img-src 'self' data:", imageOrigin].filter(Boolean).join(" "),
    "object-src 'none'",
    nonce ? `script-src 'nonce-${nonce}'` : "script-src 'none'",
    "style-src 'unsafe-inline'",
  ].join("; ");
}

function esc(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonLd(value) {
  const escaped = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", "\u2028": "\\u2028", "\u2029": "\\u2029" };
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => escaped[character]);
}

function xmlSafeText(value = "") {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isLoopback(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function validatedOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback(url.hostname))) return null;
    if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.split(",", 1)[0].trim() : "";
}

function publicOrigin(req) {
  const configured = validatedOrigin(process.env.PUBLIC_SITE_URL);
  if (configured) return configured;

  const vercelProduction = validatedOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelProduction) return vercelProduction;

  const host = firstHeaderValue(req.headers["x-forwarded-host"] || req.headers.host);
  const protocol = firstHeaderValue(req.headers["x-forwarded-proto"]) || "https";
  if (/^[a-z\d.-]+(?::\d{1,5})?$/i.test(host) && (protocol === "https" || protocol === "http")) {
    const requestOrigin = validatedOrigin(`${protocol}://${host}`);
    if (requestOrigin && isLoopback(new URL(requestOrigin).hostname)) return requestOrigin;
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

function validatedSupabaseUrl() {
  return validatedOrigin(SUPABASE_URL);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isTimeout(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function setDocumentHeaders(res, nonce = "", imageOrigin = "") {
  res.setHeader("Content-Security-Policy", contentSecurityPolicy(nonce, imageOrigin));
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Strict-Transport-Security", "max-age=31536000");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
}

function sendHtml(req, res, status, html, cacheControl = "no-store", nonce = "", imageOrigin = "") {
  setDocumentHeaders(res, nonce, imageOrigin);
  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (req.method === "HEAD") return res.status(status).end();
  return res.status(status).send(html);
}

function errorPage(title, message, origin) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)} | Presspaper</title><meta name="robots" content="noindex"/>
<style>body{margin:0;background:#090909;color:#f4f4f4;font-family:-apple-system,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center}a{color:#9a9a9a}</style>
</head><body><main><h1>${esc(title)}</h1><p>${esc(message)}</p>
<p><a href="${esc(origin)}/">Go to Presspaper</a></p></main></body></html>`;
}

async function fetchVerification(supabaseUrl, institutionSlug) {
  if (!institutionSlug) return false;
  const url = new URL("/rest/v1/rpc/org_is_verified", supabaseUrl);
  const key = SUPABASE_ANON;
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: institutionSlug }),
      },
      3_000
    );
    if (!response.ok) return false;
    return (await response.json().catch(() => false)) === true;
  } catch {
    return false;
  }
}

async function fetchReleaseImage(supabaseUrl, id, release) {
  const slug = release.institution_slug;
  const files = release.extras?.files;
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) || !Array.isArray(files)) return null;

  const prefix = `${slug}/${id}/`;
  const image = files.find((file) => file?.kind === "image" && typeof file.path === "string"
    && file.path.startsWith(prefix)
    && /^[a-f0-9-]{36}\.(jpe?g|png|webp)$/.test(file.path.slice(prefix.length)));
  if (!image) return null;

  const objectPath = `/object/sign/release-files/${image.path}`;
  const storagePath = `/storage/v1${objectPath}`;
  try {
    const response = await fetchWithTimeout(new URL(storagePath, supabaseUrl), {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 1800 }),
    }, 3_000);
    if (!response.ok) return null;

    const { signedURL } = await response.json();
    if (typeof signedURL !== "string" || !signedURL.startsWith(`${objectPath}?`)) return null;
    const url = new URL(`/storage/v1${signedURL}`, supabaseUrl);
    if (!url.searchParams.get("token")) return null;
    return { url: url.href, alt: image.alt || image.name || "" };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const origin = publicOrigin(req);

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendHtml(req, res, 405, errorPage("Method not allowed", "This endpoint only accepts GET requests.", origin));
  }

  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!UUID.test(id)) {
    return sendHtml(req, res, 400, errorPage("Invalid release", "The release identifier is invalid.", origin));
  }

  const supabaseUrl = validatedSupabaseUrl();
  if (!supabaseUrl || !SUPABASE_ANON) {
    return sendHtml(req, res, 503, errorPage("Temporarily unavailable", "Release data is temporarily unavailable.", origin));
  }

  const releasesUrl = new URL("/rest/v1/releases", supabaseUrl);
  releasesUrl.searchParams.set("id", `eq.${id}`);
  releasesUrl.searchParams.set("status", "eq.Published");
  releasesUrl.searchParams.set(
    "select",
    "id,institution_slug,institution_name,type,heading,subheading,body,published_at,created_at,extras"
  );
  releasesUrl.searchParams.set("limit", "1");

  let response;
  try {
    response = await fetchWithTimeout(releasesUrl, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, Accept: "application/json" },
    });
  } catch (error) {
    const status = isTimeout(error) ? 504 : 502;
    return sendHtml(req, res, status, errorPage("Temporarily unavailable", "Release data could not be loaded.", origin));
  }

  if (!response.ok) {
    return sendHtml(req, res, 502, errorPage("Temporarily unavailable", "Release data could not be loaded.", origin));
  }

  let rows;
  try {
    rows = await response.json();
  } catch {
    return sendHtml(req, res, 502, errorPage("Temporarily unavailable", "Release data could not be loaded.", origin));
  }

  if (!Array.isArray(rows)) {
    return sendHtml(req, res, 502, errorPage("Temporarily unavailable", "Release data could not be loaded.", origin));
  }

  const release = rows[0];
  if (!release) {
    return sendHtml(req, res, 404, errorPage("Release not found", "This release may be unpublished or moved.", origin));
  }

  if (req.query.image === "1") {
    const image = await fetchReleaseImage(supabaseUrl, id, release);
    setDocumentHeaders(res);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Location", image?.url ?? `${origin}/og.png`);
    return res.status(302).end();
  }

  const [verified, image] = await Promise.all([
    fetchVerification(supabaseUrl, release.institution_slug),
    fetchReleaseImage(supabaseUrl, id, release),
  ]);
  const institutionName = release.institution_name || "Presspaper";
  const title = `${release.heading} - ${institutionName}`;
  const descriptionSource = release.subheading || release.body || "Public information published on Presspaper.";
  const description = xmlSafeText(descriptionSource).slice(0, 200);
  const articleBody = xmlSafeText(release.body || release.subheading || "").slice(0, 100_000);
  const publishedDate = new Date(release.published_at || release.created_at);
  const published = Number.isNaN(publishedDate.getTime()) ? null : publishedDate.toISOString();
  const formattedPublished = published
    ? publishedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "Date unavailable";
  const canonical = `${origin}/r/${encodeURIComponent(id)}`;
  const ogImage = image ? `${canonical}?image=1` : `${origin}/og.png`;
  const appUrl = `${origin}/release/${encodeURIComponent(id)}`;
  const nonce = randomBytes(18).toString("base64");

  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: release.heading,
    description: release.subheading || "",
    ...(published ? { datePublished: published, dateModified: published } : {}),
    articleBody,
    ...(image ? { image: ogImage } : {}),
    author: { "@type": "Organization", name: institutionName },
    publisher: { "@type": "Organization", name: "Presspaper" },
    mainEntityOfPage: canonical,
  };

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} | Presspaper</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta property="og:site_name" content="Presspaper" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:image" content="${esc(ogImage)}" />
${published ? `<meta property="article:published_time" content="${esc(published)}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<script type="application/ld+json" nonce="${esc(nonce)}">${safeJsonLd(ld)}</script>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#090909; color:#f4f4f4; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif; line-height:1.6; }
  .wrap { max-width:760px; margin:0 auto; padding:40px 24px 80px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; color:#fff; text-decoration:none; }
  .brand .glyph { width:26px; height:26px; border-radius:7px; background:linear-gradient(135deg,#606060,#6f6f6f); display:inline-block; }
  .badge { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:#8f8f8f; background:rgba(143, 143, 143, .12); border:1px solid rgba(143, 143, 143, .25); padding:5px 12px; border-radius:999px; }
  .badge.neutral { color:#a2a2a2; background:rgba(162, 162, 162, .08); border-color:rgba(162, 162, 162, .2); }
  h1 { font-size:34px; line-height:1.15; margin:22px 0 14px; }
  .lead { font-size:18px; color:#a2a2a2; margin:0 0 24px; }
  .meta { font-size:13px; color:#8f8f8f; display:flex; gap:14px; align-items:center; margin-bottom:28px; }
  .cover { display:block; width:100%; height:auto; border-radius:12px; margin-bottom:28px; }
  .body { font-size:16px; color:#d4d4d4; white-space:pre-wrap; }
  .cta { display:inline-flex; align-items:center; gap:8px; margin-top:36px; background:#fff; color:#0a0a0a; font-weight:600; text-decoration:none; padding:12px 22px; border-radius:8px; }
  .rule { height:1px; background:rgba(255,255,255,.08); margin:28px 0; border:0; }
  footer { color:#8f8f8f; font-size:12.5px; margin-top:48px; }
  a.inline { color:#9a9a9a; }
</style>
</head>
<body>
  <main class="wrap">
    <a class="brand" href="${esc(origin)}/"><span class="glyph"></span> Presspaper</a>
    <hr class="rule" />
    <span class="badge${verified ? "" : " neutral"}">${verified ? "Verified institution" : "Published by"} - ${esc(institutionName)}</span>
    <h1>${esc(release.heading)}</h1>
    ${release.subheading ? `<p class="lead">${esc(release.subheading)}</p>` : ""}
    <div class="meta">
      <span>${esc(release.type || "Announcement")}</span>
      <span>-</span>
      <span>${esc(formattedPublished)}</span>
    </div>
    ${image ? `<img class="cover" src="${esc(image.url)}" alt="${esc(image.alt)}" />` : ""}
    ${articleBody ? `<div class="body">${esc(articleBody)}</div>` : ""}
    <a class="cta" href="${esc(appUrl)}">Read on Presspaper</a>
    <footer>Published on <a class="inline" href="${esc(origin)}/">Presspaper</a>, the home for public information.</footer>
  </main>
</body>
</html>`;

  return sendHtml(req, res, 200, html, "public, max-age=0, s-maxage=60, must-revalidate", nonce, image ? supabaseUrl : "");
}

export { contentSecurityPolicy, esc, publicOrigin, safeJsonLd, validatedOrigin, xmlSafeText };
