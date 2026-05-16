"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

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
  return <>{children}</>;
}
