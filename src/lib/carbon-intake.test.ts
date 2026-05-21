import { afterEach, describe, expect, it, vi } from "vitest";
import { submitIntake, type CarbonContactPayload } from "./carbon-intake";

/**
 * C.S.1.8 — submitIntake lead routing.
 *
 * The Covr-Worker branch and its NEXT_PUBLIC_LEADS_ENDPOINT_READY gate
 * were removed; every submission goes straight to /api/lead-fallback.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const payload: CarbonContactPayload = {
  source: "carbon_specialty_website_contact_form",
  reference_id: "CS-2026-AB12",
  submitted_at: "2026-05-21T00:00:00.000Z",
  name: "Test Prospect",
  email: "prospect@example.com",
};

describe("submitIntake", () => {
  it("POSTs the payload to /api/lead-fallback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitIntake(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/lead-fallback");
    expect(result).toEqual({
      ok: true,
      route: "fallback-email",
      reference: "CS-2026-AB12",
    });
  });

  it("ignores NEXT_PUBLIC_LEADS_ENDPOINT_READY — never calls the Worker endpoint", async () => {
    // Even with the legacy gate flipped "ready" and an endpoint set,
    // the only request must be to the in-app fallback route.
    vi.stubEnv("NEXT_PUBLIC_LEADS_ENDPOINT_READY", "true");
    vi.stubEnv("NEXT_PUBLIC_LEADS_ENDPOINT", "https://worker.example.com/leads/inbound");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await submitIntake(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/lead-fallback");
    const calledUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(calledUrls).not.toContain("https://worker.example.com/leads/inbound");
  });

  it("returns ok:false when the route is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await submitIntake(payload);
    expect(result.ok).toBe(false);
    expect(result.route).toBe("fallback-email");
  });
});
