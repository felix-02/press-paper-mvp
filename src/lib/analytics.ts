import posthog from "posthog-js";

// Product analytics via PostHog (free tier). Entirely optional: with no
// VITE_POSTHOG_KEY every call is a no-op, so the app is unaffected. When a key
// is present, founders get real funnels, retention and active-user metrics in
// the PostHog dashboard — the usage data investors want to see.

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

let enabled = false;

export function initAnalytics() {
  if (enabled || !KEY) return;
  try {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // we capture manually (hash router)
      capture_pageleave: true,
      persistence: "localStorage",
    });
    enabled = true;
  } catch {
    enabled = false;
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!enabled) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* ignore */
  }
}

export function pageview(path: string) {
  if (!enabled) return;
  try {
    posthog.capture("$pageview", { $current_url: path });
  } catch {
    /* ignore */
  }
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (!enabled) return;
  try {
    posthog.identify(id, props);
  } catch {
    /* ignore */
  }
}

export function resetAnalytics() {
  if (!enabled) return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}
