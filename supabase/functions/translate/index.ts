// Presspaper — translation Edge Function (Gemini, free tier).
// Translates an array of strings to a target language, returning them in order.
// Reuses the same GEMINI_API_KEY secret as `summarize`.
//
// Deploy:  supabase functions deploy translate
// Secret:  (already set if you deployed summarize) supabase secrets set GEMINI_API_KEY=...

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { target, texts } = (await req.json().catch(() => ({}))) as { target?: string; texts?: string[] };
    if (!target || !Array.isArray(texts) || texts.length === 0) return json({ texts: texts ?? [] });

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";
    if (!apiKey) return json({ texts, error: "GEMINI_API_KEY not set" });

    const prompt =
      `Translate each string in this JSON array into ${target}. ` +
      `Preserve meaning, tone and any names. Return ONLY a JSON array of the translated strings in the same order, ` +
      `with no markdown, no code fences and no commentary.\n\n` +
      JSON.stringify(texts);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
        }),
      }
    );
    const data = await res.json();
    let out = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    out = String(out).trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    let parsed: string[] | null = null;
    try {
      const arr = JSON.parse(out);
      if (Array.isArray(arr)) parsed = arr.map((x) => String(x));
    } catch {
      parsed = null;
    }

    if (!parsed || parsed.length !== texts.length) return json({ texts, error: "Translation parse failed" });
    return json({ texts: parsed });
  } catch (e) {
    return json({ texts: [], error: String(e) });
  }
});
