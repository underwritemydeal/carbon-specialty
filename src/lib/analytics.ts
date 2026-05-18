"use client";

// Event taxonomy for Carbon Specialty (same PostHog project as Covr AI
// so the funnel can span both products).

export type CSEvent =
  | "cs_hero_input_focus"
  | "cs_hero_input_submit"
  | "cs_chat_opened"
  | "cs_chat_user_message"
  | "cs_chat_intake_completed"
  | "cs_chat_fallback_mode"
  | "cs_chat_place_selected"
  | "cs_chat_mic_start"
  | "cs_chat_tts_autoplay"
  | "cs_chat_tts_manual"
  | "cs_form_step_submitted"
  | "cs_form_completed"
  | "cs_phone_clicked"
  | "cs_quote_cta_clicked"
  | "cs_how_it_works_viewed"
  | "cs_insights_post_viewed"
  | "cs_lead_captured";

type PostHogShim = { capture?: (event: string, props?: Record<string, unknown>) => void };

export function track(event: CSEvent, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { posthog?: PostHogShim };
  try {
    w.posthog?.capture?.(event, props);
  } catch {
    /* swallow — analytics is never load-bearing */
  }
}
