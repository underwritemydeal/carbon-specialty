import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * C.S.1.8 — server-side PostHog capture helper.
 *
 * `posthog-node` is mocked so the test asserts on the capture/flush/
 * shutdown calls without any network.
 */

const { captureMock, flushMock, shutdownMock, PostHogMock } = vi.hoisted(() => {
  const captureMock = vi.fn();
  const flushMock = vi.fn().mockResolvedValue(undefined);
  const shutdownMock = vi.fn().mockResolvedValue(undefined);
  // A plain function (not an arrow) so `new PostHog(...)` is constructable.
  const PostHogMock = vi.fn(function (this: Record<string, unknown>) {
    this.capture = captureMock;
    this.flush = flushMock;
    this.shutdown = shutdownMock;
  });
  return { captureMock, flushMock, shutdownMock, PostHogMock };
});

vi.mock("posthog-node", () => ({ PostHog: PostHogMock }));

import { captureServerEvent } from "./posthog-server";

beforeEach(() => {
  captureMock.mockClear();
  flushMock.mockClear();
  shutdownMock.mockClear();
  PostHogMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("captureServerEvent", () => {
  it("captures the event with $ip suppression, then flushes and shuts down", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");

    await captureServerEvent("lead_submitted", "CS-2026-AB12", {
      tenant_id: "carbon-specialty",
      reference_id: "CS-2026-AB12",
    });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock.mock.calls[0][0]).toEqual({
      distinctId: "CS-2026-AB12",
      event: "lead_submitted",
      properties: {
        tenant_id: "carbon-specialty",
        reference_id: "CS-2026-AB12",
        $ip: "0.0.0.0",
      },
    });
    expect(flushMock).toHaveBeenCalled();
    expect(shutdownMock).toHaveBeenCalled();
  });

  it("falls back to a server-anonymous distinct id", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");

    await captureServerEvent("chat_error", null, {
      error_kind: "BAD_REQUEST",
      tenant_id: "unknown",
    });

    expect(captureMock.mock.calls[0][0].distinctId).toBe("server-anonymous");
    expect(captureMock.mock.calls[0][0].event).toBe("chat_error");
    expect(captureMock.mock.calls[0][0].properties.$ip).toBe("0.0.0.0");
  });

  it("no-ops when NEXT_PUBLIC_POSTHOG_KEY is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");

    await captureServerEvent("enrichment_succeeded", "server-anonymous", {
      sources_succeeded: ["geocoding"],
      has_parcel_data: false,
      has_street_view: false,
    });

    expect(PostHogMock).not.toHaveBeenCalled();
    expect(captureMock).not.toHaveBeenCalled();
  });
});
