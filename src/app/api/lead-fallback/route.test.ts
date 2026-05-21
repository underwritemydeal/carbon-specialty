import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * C.S.1.8 — /api/lead-fallback intake path.
 *
 * `resend` and the server PostHog helper are mocked; the test asserts
 * the email shape (subject + summary-template body) and the
 * `lead_submitted` analytics event.
 */

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
  // `new Resend(key)` — must be constructable, so a class, not an arrow fn.
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { captureServerEvent } from "@/lib/posthog-server";

beforeEach(() => {
  sendMock.mockReset();
  vi.mocked(captureServerEvent).mockClear();
  vi.stubEnv("LEAD_NOTIFICATION_EMAIL", "leads@example.com");
  vi.stubEnv("RESEND_API_KEY", "re_test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function intakeRequest() {
  return new Request("http://localhost/api/lead-fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "carbon_specialty_website_chat",
      reference_id: "CS-2026-AB12",
      submitted_at: "2026-05-21T00:00:00.000Z",
      asset_class: "multifamily",
      named_insured: "ACME Holdings LLC",
      unit_count: 24,
      contact: { name: "Jane Doe", role: "owner", email: "jane@example.com", phone: "555-0100" },
    }),
  });
}

describe("/api/lead-fallback — intake submission", () => {
  it("emits lead_submitted and returns the messageId after a successful send", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null });

    const res = await POST(intakeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      messageId: "msg_123",
      reference: "CS-2026-AB12",
    });
    expect(captureServerEvent).toHaveBeenCalledWith("lead_submitted", "CS-2026-AB12", {
      tenant_id: "carbon-specialty",
      reference_id: "CS-2026-AB12",
    });
  });

  it("builds the subject and a summary-template body", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_456" }, error: null });

    await POST(intakeRequest());

    const sent = sendMock.mock.calls[0][0];
    expect(sent.subject).toBe("New intake — CS-2026-AB12 — carbon-specialty");
    expect(sent.to).toBe("leads@example.com");
    expect(sent.text).toContain("INTAKE SUMMARY — Carbon Specialty");
    expect(sent.text).toContain("ACME Holdings LLC");
    // No unresolved placeholders leak into the email body.
    expect(sent.text).not.toMatch(/\{\{\w+\}\}/);
  });

  it("returns 500 and does not emit lead_submitted on a Resend error", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "domain not verified" } });

    const res = await POST(intakeRequest());

    expect(res.status).toBe(500);
    expect(captureServerEvent).not.toHaveBeenCalled();
  });
});
