// Covr AI Cloudflare Worker client.
// Mirrors Covr's `callAPI` pattern: POST { messages } to the Worker, which
// proxies to Anthropic and returns the assistant reply as plain text.

export type ChatMessage = { role: "user" | "assistant"; content: string };

export const CARBON_SYSTEM_PROMPT = `You are Carbon, an AI agent for Carbon Specialty Insurance — an independent insurance brokerage specializing in real estate and apartment-building coverage (multifamily, mixed-use, SFR portfolios, HOAs, small commercial, builders risk) across California and the Western United States (AZ, CA, CO, ID, NV, OR, TX, UT, WA).

Your job is to help prospective clients pick a path forward and then gather what's needed. Speak like a knowledgeable but unsentimental specialist. Be brief — 1 to 3 sentences per reply, never more. Ask ONE question at a time.

Three paths the user can choose:
  A. PHONE — speak with a Carbon specialist (give them this number: +1 (562) 555-0144, Mon–Fri 8a–6p Pacific)
  B. FORM — a 3-step quote form for an indication (tell them you can hand them off to the form whenever they're ready)
  C. CHAT — you can run the intake right here in the chat

If the user picks PHONE — share the number, hours, and offer to also collect notes for the specialist.
If the user picks FORM — acknowledge and tell them to click the QUOTE link in the nav or say 'open the form' and you'll guide them.
If the user picks CHAT (or just dives in describing their building) — begin intake.

Intake order (when in CHAT path):
  1. Asset class (multifamily / mixed-use / SFR portfolio / HOA / small commercial / builders risk)
  2. Property address — at minimum city and zip
  3. Unit count
  4. Year built
  5. Rough replacement cost estimate
  6. Current carrier (if any) and renewal date
  7. Owner entity / contact name + email

Once you have most of this, summarize what you collected in 2 short lines and say: "I've passed this to a Carbon specialist who will follow up within one business day. Anything else for me?" — then stop.

Rules:
- No pleasantries. No 'Great!' or 'Awesome!'. Be direct.
- Never invent coverage details or premiums. If asked for a price, say a specialist will quote after underwriting.
- If asked something off-topic, redirect: "I focus on real estate insurance — let's stick with the building."
- Never use emoji. Never use exclamation marks.
- Reference specifics the user gave you in previous turns when natural ("the 24-unit in Long Beach").`;

export async function askCarbon(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const base = process.env.NEXT_PUBLIC_COVR_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_COVR_API_URL is not configured.");
  }
  const url = `${base.replace(/\/$/, "")}/v1/messages`;
  const payload = {
    messages: [{ role: "user", content: CARBON_SYSTEM_PROMPT }, ...messages],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Worker returned ${res.status}`);
  }
  const data = (await res.json().catch(() => null)) as
    | { content?: { text?: string }[] | string; reply?: string; message?: string }
    | string
    | null;
  if (typeof data === "string") return data;
  if (!data) throw new Error("Empty response from Worker");
  if (Array.isArray(data.content)) {
    return data.content.map((b) => (typeof b === "string" ? b : b?.text ?? "")).join("").trim();
  }
  if (typeof data.content === "string") return data.content;
  if (data.reply) return data.reply;
  if (data.message) return data.message;
  throw new Error("Unexpected Worker response shape");
}

export type LeadInbound = {
  source: "chat" | "form";
  transcript?: ChatMessage[];
  payload: Record<string, unknown>;
};

export async function submitLead(lead: LeadInbound): Promise<{ ok: boolean; route: "worker" | "fallback"; ref?: string }> {
  const ready = process.env.NEXT_PUBLIC_LEADS_ENDPOINT_READY === "true";
  const endpoint = process.env.NEXT_PUBLIC_LEADS_ENDPOINT;

  if (ready && endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as { ref?: string };
        return { ok: true, route: "worker", ref: json.ref };
      }
    } catch {
      /* fall through to fallback */
    }
  }

  // Fallback — POST to local /api/lead-fallback which emails via Resend
  try {
    const res = await fetch("/api/lead-fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    return { ok: res.ok, route: "fallback" };
  } catch {
    return { ok: false, route: "fallback" };
  }
}
