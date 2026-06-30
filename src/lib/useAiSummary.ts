import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Release } from "@/types";

interface AiSummaryState {
  summary: string;
  loading: boolean;
  isAi: boolean;
}

/**
 * Returns an AI-generated summary for a release via the `summarize` Edge
 * Function (Gemini, server-side). Falls back to the provided canned summary when
 * Supabase/AI isn't configured or the call fails — so the panel always shows
 * something. `bodyText` provides extra source text for demo releases that have
 * no stored body (real releases are summarised from their DB body server-side).
 */
export function useAiSummary(release: Release, fallback: string, bodyText?: string): AiSummaryState {
  const [summary, setSummary] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const [isAi, setIsAi] = useState(false);
  const ranRef = useRef<string | null>(null);

  useEffect(() => {
    setSummary(fallback);
    setIsAi(false);

    if (!isSupabaseConfigured || !supabase) return;
    if (ranRef.current === release.id) return;
    ranRef.current = release.id;

    let active = true;
    setLoading(true);
    supabase.functions
      .invoke("summarize", {
        body: {
          releaseId: release.id,
          heading: release.heading,
          subheading: release.subheading,
          body: bodyText ?? "",
        },
      })
      .then(
        ({ data, error }) => {
          if (!active) return;
          setLoading(false);
          if (!error && data && (data as { summary?: string }).summary) {
            setSummary((data as { summary: string }).summary);
            setIsAi(true);
          }
        },
        () => {
          if (active) setLoading(false);
        }
      );

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [release.id]);

  return { summary, loading, isAi };
}
