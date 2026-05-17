/**
 * Carbon intake — sprint C.S.1.4.
 *
 * Three concerns:
 *
 *   1. `askCarbonIntake` runs a conversational turn against the Covr
 *      Worker using the CARBON_INTAKE_SYSTEM_PROMPT.
 *   2. `extractIntakePayload` runs the SECOND call once the wrap-up
 *      sentinel fires — same Worker, different system prompt, returns
 *      a structured `CarbonIntakePayload`.
 *   3. `submitIntake` persists the payload. Forward-compat path: if
 *      `NEXT_PUBLIC_LEADS_ENDPOINT_READY` is `"true"`, POST to the
 *      Worker's `/leads/inbound`. Otherwise (always, today) POST to
 *      the in-app `/api/lead-fallback` route, which emails via Resend.
 *
 * All Worker calls share `callWorker` so error classification (401/403
 * auth, 5xx server, network) lives in one place. Callers consume the
 * structured `WorkerError` to decide whether to retry or fall back to
 * the contact-form mode in CarbonChat.
 */

import {
  CARBON_INTAKE_SYSTEM_PROMPT,
  CARBON_EXTRACTION_SYSTEM_PROMPT,
} from "./carbon-system-prompt";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export interface CarbonIntakePayload {
  asset_type:
    | "multifamily"
    | "mixed_use"
    | "sfr_portfolio"
    | "hoa"
    | "small_commercial_re"
    | "builders_risk"
    | "unknown";
  location: { city?: string; state?: string; address?: string };
  unit_count?: number;
  year_built?: number;
  construction_type?: string;
  current_carrier?: string;
  current_expiration?: string;
  loss_history_summary?: string;
  inquiry_trigger?: string;
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    preferred_method?: "email" | "phone" | "either";
  };
  conversation_full: string;
  source: "carbon_specialty_website_chat";
  submitted_at: string;
  reference_id: string;
}

/** Lightweight contact-form payload used when the chat falls through to
 *  the "leave your name and email" mode. Shares the lead-fallback route. */
export interface CarbonContactPayload {
  source: "carbon_specialty_website_contact_form";
  reference_id: string;
  submitted_at: string;
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
}

/** Three-step /quote form payload — different from the chat intake but
 *  the same lead destination, so it also goes through `submitIntake`. */
export interface CarbonFormPayload {
  source: "carbon_specialty_website_quote_form";
  reference_id: string;
  submitted_at: string;
  asset_class?: string;
  address?: string;
  units?: string;
  valuation?: string;
  year_built?: string;
  entity?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  coverages?: string[];
}

export type LeadPayload = CarbonIntakePayload | CarbonContactPayload | CarbonFormPayload;

export type WorkerErrorKind = "no-endpoint" | "auth" | "server" | "network" | "bad-shape";
export class WorkerError extends Error {
  constructor(public kind: WorkerErrorKind, message: string) {
    super(message);
    this.name = "WorkerError";
  }
}

// =============================================================================
// Reference ID
// =============================================================================

/** Generates a short, memorable ID of the form CS-YYYY-XXXX where XXXX
 *  is 4 uppercase hex chars derived from the current timestamp. Stable
 *  across the conversation once generated. */
export function generateReferenceId(now: Date = new Date()): string {
  const year = now.getFullYear();
  // 4 hex chars from low-order ms — collision-resistant enough for
  // human matching when paired with the timestamp in the email body.
  const tail = (now.getTime() & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  return `CS-${year}-${tail}`;
}

// =============================================================================
// Worker call — single point of error classification
// =============================================================================

const WORKER_BASE = () => (process.env.NEXT_PUBLIC_COVR_API_URL ?? "").replace(/\/$/, "");

async function callWorker(payload: {
  systemPrompt: string;
  messages: ChatMessage[];
}): Promise<string> {
  const base = WORKER_BASE();
  if (!base) throw new WorkerError("no-endpoint", "NEXT_PUBLIC_COVR_API_URL is not set");

  const url = `${base}/v1/messages`;
  // Same shape Covr uses: prepend the system prompt as a user-role first
  // message so the Worker can stay a simple proxy.
  const body = {
    messages: [
      { role: "user" as const, content: payload.systemPrompt },
      ...payload.messages,
    ],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // fetch() throws on network/CORS/DNS failures
    throw new WorkerError("network", e instanceof Error ? e.message : String(e));
  }

  if (res.status === 401 || res.status === 403) {
    throw new WorkerError("auth", `Worker returned ${res.status}`);
  }
  if (res.status >= 500) {
    throw new WorkerError("server", `Worker returned ${res.status}`);
  }
  if (!res.ok) {
    throw new WorkerError("server", `Worker returned ${res.status}`);
  }

  const data = (await res.json().catch(() => null)) as
    | { content?: { text?: string }[] | string; reply?: string; message?: string }
    | string
    | null;

  if (data == null) throw new WorkerError("bad-shape", "Empty Worker response");
  if (typeof data === "string") return data;
  if (Array.isArray(data.content)) {
    return data.content
      .map((b) => (typeof b === "string" ? b : b?.text ?? ""))
      .join("")
      .trim();
  }
  if (typeof data.content === "string") return data.content;
  if (data.reply) return data.reply;
  if (data.message) return data.message;
  throw new WorkerError("bad-shape", "Unrecognized Worker response shape");
}

// =============================================================================
// Public API
// =============================================================================

/** Runs a single conversational turn through the Worker using the
 *  Carbon intake system prompt. Returns the assistant's reply. */
export async function askCarbonIntake(history: ChatMessage[]): Promise<string> {
  return callWorker({
    systemPrompt: CARBON_INTAKE_SYSTEM_PROMPT,
    messages: history,
  });
}

/** Runs the extraction call. Sends the full transcript as one user message
 *  with the extraction prompt, parses the JSON response, returns the
 *  structured payload (without the conversation_full / source / timestamp
 *  envelope — caller adds those). Throws WorkerError on bad shape. */
export async function extractIntakePayload(
  history: ChatMessage[],
): Promise<Omit<CarbonIntakePayload, "conversation_full" | "source" | "submitted_at" | "reference_id">> {
  const transcript = history
    .map((m) => `[${m.role}] ${m.content}`)
    .join("\n\n");

  const raw = await callWorker({
    systemPrompt: CARBON_EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Transcript:\n\n${transcript}` }],
  });

  // Strip code fences if the model wrapped its output despite instructions.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new WorkerError("bad-shape", "Extraction did not return parseable JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new WorkerError("bad-shape", "Extraction returned non-object JSON");
  }

  // Conservatively normalize: ensure asset_type, location, contact exist.
  const p = parsed as Record<string, unknown>;
  const out: Omit<
    CarbonIntakePayload,
    "conversation_full" | "source" | "submitted_at" | "reference_id"
  > = {
    asset_type: (p.asset_type as CarbonIntakePayload["asset_type"]) ?? "unknown",
    location: (p.location as CarbonIntakePayload["location"]) ?? {},
    contact: (p.contact as CarbonIntakePayload["contact"]) ?? {},
  };
  if (typeof p.unit_count === "number") out.unit_count = p.unit_count;
  if (typeof p.year_built === "number") out.year_built = p.year_built;
  if (typeof p.construction_type === "string") out.construction_type = p.construction_type;
  if (typeof p.current_carrier === "string") out.current_carrier = p.current_carrier;
  if (typeof p.current_expiration === "string") out.current_expiration = p.current_expiration;
  if (typeof p.loss_history_summary === "string") out.loss_history_summary = p.loss_history_summary;
  if (typeof p.inquiry_trigger === "string") out.inquiry_trigger = p.inquiry_trigger;
  return out;
}

/** Persists the lead. Forward-compat path uses the Worker's
 *  /leads/inbound when NEXT_PUBLIC_LEADS_ENDPOINT_READY === "true";
 *  otherwise (today) it goes straight to /api/lead-fallback which
 *  emails via Resend. Returns { ok, route, reference } on success. */
export async function submitIntake(
  payload: LeadPayload,
): Promise<{ ok: boolean; route: "worker" | "fallback-email"; reference: string }> {
  const ready = process.env.NEXT_PUBLIC_LEADS_ENDPOINT_READY === "true";
  const endpoint = process.env.NEXT_PUBLIC_LEADS_ENDPOINT;

  if (ready && endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { ok: true, route: "worker", reference: payload.reference_id };
    } catch {
      // fall through
    }
  }

  // Resend fallback — the local Next route handles auth, formatting, send.
  try {
    const res = await fetch("/api/lead-fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return {
      ok: res.ok,
      route: "fallback-email",
      reference: payload.reference_id,
    };
  } catch {
    return { ok: false, route: "fallback-email", reference: payload.reference_id };
  }
}

/** Wraps the extraction output in the full payload envelope. */
export function buildIntakePayload(
  extracted: Omit<CarbonIntakePayload, "conversation_full" | "source" | "submitted_at" | "reference_id">,
  history: ChatMessage[],
  referenceId: string,
): CarbonIntakePayload {
  return {
    ...extracted,
    conversation_full: history.map((m) => `[${m.role}] ${m.content}`).join("\n\n"),
    source: "carbon_specialty_website_chat",
    submitted_at: new Date().toISOString(),
    reference_id: referenceId,
  };
}
