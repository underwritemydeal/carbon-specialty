/**
 * Server-side PostHog capture — sprint C.S.1.8.
 *
 * The API routes (chat, property/enrich, lead-fallback) emit analytics
 * events that must not be spoofable from the browser. `posthog-node`
 * is the server SDK for that.
 *
 * `captureServerEvent` builds a short-lived client per call, captures
 * one event, flushes, and shuts down before returning — the route
 * awaits it so the event is delivered before the HTTP response is
 * sent. A per-call client (rather than a long-lived singleton) keeps
 * this safe on Vercel's Fluid Compute, where an instance may be frozen
 * between requests with a buffered-but-unsent event.
 *
 * Privacy posture: every event carries `$ip: "0.0.0.0"` so PostHog
 * does not derive a geo-IP. Callers must never pass PII (no email,
 * address, or name) in `properties`.
 */

import { PostHog } from "posthog-node";

/** The four server-originated events in the C.S.1.8 taxonomy. */
export type ServerAnalyticsEvent =
  | "enrichment_succeeded"
  | "enrichment_failed"
  | "lead_submitted"
  | "chat_error";

/**
 * Captures one server-side PostHog event. No-ops silently when
 * `NEXT_PUBLIC_POSTHOG_KEY` is unset (local dev / pre-launch) and
 * swallows any delivery error — analytics is never load-bearing.
 *
 * @param distinctId  referenceId when the request has one, else null
 *                    (resolved to "server-anonymous").
 */
export async function captureServerEvent(
  event: ServerAnalyticsEvent,
  distinctId: string | null | undefined,
  properties: Record<string, unknown>,
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 });

  try {
    client.capture({
      distinctId:
        distinctId && distinctId.trim() ? distinctId.trim() : "server-anonymous",
      event,
      // $ip suppresses PostHog's geo-IP enrichment.
      properties: { ...properties, $ip: "0.0.0.0" },
    });
    await client.flush();
  } catch (e) {
    console.warn("[carbon-analytics] server capture failed:", e);
  } finally {
    await client.shutdown();
  }
}
