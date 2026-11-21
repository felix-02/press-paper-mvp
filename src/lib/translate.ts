import { supabase } from "@/lib/supabase";

type TranslationResult =
  | { texts: string[]; error: null }
  | { texts: null; error: string };

function translationError(status?: number): TranslationResult {
  switch (status) {
    case 401:
    case 403:
      return { texts: null, error: "Sign in again to translate this release." };
    case 413:
      return { texts: null, error: "This release is too long for the translation service." };
    case 429:
      return { texts: null, error: "The translation service is busy. Try again later." };
    case 504:
      return { texts: null, error: "Translation took too long. Try again in a moment." };
    default:
      return { texts: null, error: "Translation is unavailable right now. The original release is still available." };
  }
}

export async function translateTexts(target: string, texts: string[], signal?: AbortSignal): Promise<TranslationResult> {
  if (!supabase) return translationError();
  try {
    const { data, error, response } = await supabase.functions.invoke<{ texts?: unknown }>("translate", {
      body: { target, texts },
      signal,
      timeout: 75_000,
    });
    if (error) return translationError(response?.status);
    const out = data?.texts;
    if (!Array.isArray(out) || out.length !== texts.length || !out.every((text) => typeof text === "string")) {
      return translationError();
    }
    return { texts: out, error: null };
  } catch {
    return translationError();
  }
}
