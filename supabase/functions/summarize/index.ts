// Presspaper — "Summarise with AI" Edge Function.
//
// Calls Google Gemini (free tier) to summarise a release, and caches the result
// on the release row so it's only generated once. The API key lives here as a
// Supabase secret (GEMINI_API_KEY) and is NEVER shipped to the browser.
//
// Deploy:   supabase functions deploy summarize
// Secret:   supabase secrets set GEMINI_API_KEY=your_key_from_ai_studio
// (optional) supabase secrets set GEMINI_MODEL=gemini-1.5-flash
//
// To use a different free provider (e.g. Groq), swap the `callGemini` body —
// the function contract (in: {releaseId, heading, subheading, body}; out:
// {summary}) stays the same.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const payload = await req.json().catch(() => ({}));
    let { heading, subheading, body } = payload as { heading?: string; subheading?: string; body?: string };
    const releaseId = (payload as { releaseId?: string }).releaseId;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey) return json({ summary: null, error: "GEMINI_API_KEY is not set" });

    const isReal = typeof releaseId === "string" && UUID.test(releaseId);
    const restHeaders = serviceKey
      ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }
      : null;

    // 1) For a real release, read the row: return the cached summary if present,
    //    otherwise use the row's authoritative heading/subheading/body.
    if (isReal && supabaseUrl && restHeaders) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/releases?id=eq.${releaseId}&select=ai_summary,heading,subheading,body`,
        { headers: restHeaders }
      );
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row?.ai_summary) return json({ summary: row.ai_summary, cached: true });
      if (row) {
        heading = row.heading ?? heading;
        subheading = row.subheading ?? subheading;
        body = row.body ?? body;
      }
    }

    // 2) Generate.
    const summary = await callGemini(apiKey, model, { heading, subheading, body });
    if (!summary) return json({ summary: null, error: "No summary produced" });

    // 3) Cache on the row (best-effort).
    if (isReal && supabaseUrl && restHeaders) {
      await fetch(`${supabaseUrl}/rest/v1/releases?id=eq.${releaseId}`, {
        method: "PATCH",
        headers: { ...restHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ ai_summary: summary }),
      }).catch(() => {});
    }

    return json({ summary });
  } catch (e) {
    return json({ summary: null, error: String(e) });
  }
});

async function callGemini(
  apiKey: string,
  model: string,
  r: { heading?: string; subheading?: string; body?: string }
): Promise<string | null> {
  const prompt =
    "You are summarising an official public-information release for citizens. " +
    "Write a clear, neutral 2–3 sentence plain-English summary. " +
    "Do not add opinions, recommendations, or any fact not present in the text.\n\n" +
    `Title: ${r.heading ?? ""}\n` +
    `Lead: ${r.subheading ?? ""}\n` +
    `Body: ${r.body ?? ""}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
      }),
    }
  );
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text.trim() : null;
}
