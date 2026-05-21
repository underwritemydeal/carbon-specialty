"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";

/**
 * App-wide PostHog provider.
 *
 * Two responsibilities:
 *   1. Initialize the `posthog-js` singleton (once) with Carbon's
 *      config. The `loaded` callback mirrors the instance onto
 *      `window.posthog` so the legacy `track()` shim in
 *      `src/lib/analytics.ts` keeps working.
 *   2. Wrap the tree in `posthog-js/react`'s provider so components
 *      can call `usePostHog()` (C.S.1.8 — CarbonChat's capture calls).
 *
 * Passing the singleton as `client` means `usePostHog()` returns the
 * same instance whether or not `init` has run yet; capture calls made
 * before init are safely buffered by posthog-js.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    if (!key) return;
    if (typeof window === "undefined") return;
    if ((window as unknown as { __posthog_init?: boolean }).__posthog_init) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
      autocapture: true,
      loaded: () => {
        (window as unknown as { posthog: typeof posthog }).posthog = posthog;
        (window as unknown as { __posthog_init: boolean }).__posthog_init = true;
      },
    });
  }, []);

  return <PostHogReactProvider client={posthog}>{children}</PostHogReactProvider>;
}
