// Dynamic sitemap of published releases (for SEO). Served at /sitemap.xml.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

export default async function handler(req, res) {
  const origin = `https://${req.headers.host}`;
  let rows = [];
  try {
    if (SUPABASE_URL && SUPABASE_ANON) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/releases?status=eq.Published&select=id,published_at,created_at&order=created_at.desc&limit=5000`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      rows = await r.json();
      if (!Array.isArray(rows)) rows = [];
    }
  } catch (_e) {
    rows = [];
  }

  const urls = [
    `<url><loc>${origin}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...rows.map((x) => {
      const last = new Date(x.published_at || x.created_at).toISOString();
      return `<url><loc>${origin}/r/${x.id}</loc><lastmod>${last}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    }),
  ].join("");

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
}
