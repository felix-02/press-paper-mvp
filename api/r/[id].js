// Server-rendered public release page (for SEO + rich link sharing).
// Real HTML with Open Graph / Twitter meta + JSON-LD, fetched from Supabase.
// Lives at /r/:id (see vercel.json). The SPA stays hash-routed; this is additive.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(req, res) {
  const id = req.query.id;
  const origin = `https://${req.headers.host}`;
  const canonical = `${origin}/r/${encodeURIComponent(id)}`;

  let release = null;
  try {
    if (SUPABASE_URL && SUPABASE_ANON && id) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/releases?id=eq.${encodeURIComponent(id)}&status=eq.Published&select=*`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      const rows = await r.json();
      release = Array.isArray(rows) ? rows[0] : null;
    }
  } catch (_e) {
    release = null;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!release) {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.status(404).send(notFoundPage(origin));
    return;
  }

  const title = `${release.heading} — ${release.institution_name || "Presspaper"}`;
  const desc = (release.subheading || release.body || "Verified public information on Presspaper.").slice(0, 200);
  const published = release.published_at || release.created_at;
  const ogImage = `${origin}/og.png`;
  const appUrl = `${origin}/#/release/${encodeURIComponent(id)}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: release.heading,
    description: release.subheading || "",
    datePublished: published,
    dateModified: published,
    articleBody: release.body || release.subheading || "",
    author: { "@type": "Organization", name: release.institution_name || "Presspaper" },
    publisher: { "@type": "Organization", name: "Presspaper" },
    mainEntityOfPage: canonical,
  };

  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} | Presspaper</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${esc(canonical)}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta property="og:site_name" content="Presspaper" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${esc(canonical)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="article:published_time" content="${esc(published)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#09090b; color:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif; line-height:1.6; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; letter-spacing:-0.02em; color:#fff; text-decoration:none; }
  .brand .glyph { width:26px; height:26px; border-radius:7px; background:linear-gradient(135deg,#2563eb,#6366f1); display:inline-block; }
  .badge { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:#3b82f6; background:rgba(59,130,246,.12); border:1px solid rgba(59,130,246,.25); padding:5px 12px; border-radius:999px; }
  h1 { font-size: 34px; line-height:1.15; letter-spacing:-0.025em; margin: 22px 0 14px; }
  .lead { font-size: 18px; color:#a1a1aa; margin: 0 0 24px; }
  .meta { font-size: 13px; color:#71717a; display:flex; gap:14px; align-items:center; margin-bottom: 28px; }
  .body { font-size: 16px; color:#d4d4d8; white-space: pre-wrap; }
  .cta { display:inline-flex; align-items:center; gap:8px; margin-top:36px; background:#fff; color:#0a0a0a; font-weight:600; text-decoration:none; padding:12px 22px; border-radius:10px; }
  .rule { height:1px; background:rgba(255,255,255,.08); margin:28px 0; border:0; }
  footer { color:#52525b; font-size:12.5px; margin-top:48px; }
  a.inline { color:#3b82f6; }
</style>
</head>
<body>
  <main class="wrap">
    <a class="brand" href="${esc(origin)}/"><span class="glyph"></span> Presspaper</a>
    <hr class="rule" />
    <span class="badge">✓ Verified institution · ${esc(release.institution_name || "Presspaper")}</span>
    <h1>${esc(release.heading)}</h1>
    ${release.subheading ? `<p class="lead">${esc(release.subheading)}</p>` : ""}
    <div class="meta">
      <span>${esc(release.type || "Announcement")}</span>
      <span>·</span>
      <span>${esc(new Date(published).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}</span>
    </div>
    ${release.body ? `<div class="body">${esc(release.body)}</div>` : ""}
    <a class="cta" href="${esc(appUrl)}">Read on Presspaper →</a>
    <footer>
      Published on <a class="inline" href="${esc(origin)}/">Presspaper</a> — the home for verified public information.
    </footer>
  </main>
</body>
</html>`);
}

function notFoundPage(origin) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>Release not found | Presspaper</title><meta name="robots" content="noindex"/>
<style>body{margin:0;background:#09090b;color:#f4f4f5;font-family:-apple-system,sans-serif;display:grid;place-items:center;height:100vh;text-align:center}a{color:#3b82f6}</style>
</head><body><div><h1>Release not found</h1><p>This release may be unpublished or moved.</p>
<p><a href="${origin}/">Go to Presspaper →</a></p></div></body></html>`;
}
