/**
 * Carbon intake — sprint C.S.1.4 / updated C.S.1.6.
 *
 * Three concerns:
 *
 *   1. `askCarbonIntake` runs a conversational turn against the
 *      in-app /api/chat route (which calls Anthropic Messages API
 *      directly with the Carbon intake system prompt and the
 *      `enrich_property` tool registered). Replaces the C.S.1.4 Covr
 *      Worker integration — see AGENTS.md "Chat architecture
 *      (post-C.S.1.6)".
 *   2. `extractIntakePayload` runs the SECOND call once the wrap-up
 *      sentinel fires — same /api/chat route, mode: "extract",
 *      returns a structured `CarbonIntakePayload`.
 *   3. `submitIntake` persists the payload. Forward-compat path: if
 *      `NEXT_PUBLIC_LEADS_ENDPOINT_READY` is `"true"`, POST to the
 *      Worker's `/leads/inbound`. Otherwise (always, today) POST to
 *      the in-app `/api/lead-fallback` route, which emails via Resend.
 *
 * All chat calls share `callChat` so error classification (auth,
 * rate-limit, server, network, bad-shape, tool-fail) lives in one
 * place. Callers consume the structured `ChatError` to decide whether
 * to retry or fall back to the contact-form mode in CarbonChat.
 */

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

/** C.S.1.7.0j — handoff trigger categories. When the intake prompt
 *  fires a hard-handoff, the extraction step encodes the reason here
 *  so the specialist queue email surfaces it prominently. */
export type HandoffReason =
  | "coverage_interpretation"
  | "portfolio_tiv_over_10m"
  | "active_loss"
  | "litigation_pending";

/** C.S.1.7.0j — coverage scope the prospect is requesting. */
export type CoverageScope =
  | "property_only"
  | "property_liability"
  | "full_package"
  | "unknown";

/** C.S.1.7.0j — peril interest signal for EQ + flood. */
export type PerilInterest =
  | "currently_carry"
  | "looking_to_add"
  | "not_interested"
  | "unknown";

export interface CarbonIntakePayload {
  // Field 2 — asset class (existing). C.S.1.7.0j added "condo_unit"
  // for prospects insuring a single condo unit rather than the whole
  // HOA/building (paired with the C.S.1.7.0i Realie condo
  // disambiguation hint in chat-tools).
  asset_type:
    | "multifamily"
    | "mixed_use"
    | "sfr_portfolio"
    | "hoa"
    | "condo_unit"
    | "small_commercial_re"
    | "builders_risk"
    | "unknown";

  // Field 1 — address (location)
  location: { city?: string; state?: string; address?: string };
  unit_count?: number;
  year_built?: number;
  construction_type?: string;

  // Field 3 — coverage scope (C.S.1.7.0j)
  coverage_scope?: CoverageScope;

  // Field 4 — earthquake exposure + interest (C.S.1.7.0j)
  eq_exposure?: string;
  eq_interest?: PerilInterest;

  // Field 5 — flood exposure + interest (C.S.1.7.0j)
  flood_exposure?: string;
  flood_interest?: PerilInterest;

  // Field 6 — loss history (existing)
  loss_history_summary?: string;

  // Field 7 — effective date (C.S.1.7.0j). ISO YYYY-MM-DD where
  // possible; free-text if the prospect is ambiguous ("end of month",
  // "ASAP").
  effective_date?: string;

  // Field 8 — current carrier + expiring premium (current_carrier
  // + current_expiration existed; C.S.1.7.0j added expiring_premium).
  current_carrier?: string;
  current_expiration?: string;
  expiring_premium?: number;

  // Field 9 — contact (existing). C.S.1.7.0j added `role`.
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    role?:
      | "owner"
      | "asset_manager"
      | "property_manager"
      | "broker_referral"
      | "other"
      | "unknown";
    preferred_method?: "email" | "phone" | "either";
  };

  // Field 10 — consent to share with markets (C.S.1.7.0j).
  consent_to_share_with_markets?: boolean;

  // Inquiry trigger (existing)
  inquiry_trigger?: string;

  /** C.S.1.7.0j — handoff state. Present only when one of the four
   *  hard-handoff triggers fired during the intake; absent otherwise.
   *  When present, the wrap-up sentinel was NOT emitted and the
   *  conversation ended at the handoff. */
  handoff?: {
    reason: HandoffReason;
    /** The user's phrasing that triggered it, for the specialist's
     *  context. Truncated to ~280 chars by the extractor. */
    notes?: string;
  };

  /** C.S.1.7.0j — portfolio detection state. Present when the
   *  prospect signaled a multi-property situation. `total_tiv_usd` is
   *  numeric so the routing layer can apply the $10M threshold. */
  portfolio?: {
    is_portfolio: boolean;
    property_count?: number;
    total_tiv_usd?: number;
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

export type ChatErrorKind =
  | "auth"
  | "rate-limit"
  | "server"
  | "network"
  | "bad-shape"
  | "tool-fail";

export class ChatError extends Error {
  constructor(public kind: ChatErrorKind, message: string) {
    super(message);
    this.name = "ChatError";
  }
}

/** @deprecated Renamed in C.S.1.6 — alias kept for any external import. */
export { ChatError as WorkerError };
/** @deprecated Renamed in C.S.1.6. */
export type WorkerErrorKind = ChatErrorKind;

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
// Chat call — single point of error classification
// =============================================================================

interface ChatEnvelope {
  ok: boolean;
  text?: string;
  tools_executed?: string[];
  property_facts?: unknown;
  error?: string;
  error_kind?:
    | "BAD_REQUEST"
    | "ANTHROPIC_AUTH"
    | "ANTHROPIC_RATE_LIMIT"
    | "ANTHROPIC_SERVER"
    | "TOOL_EXECUTION_FAIL"
    | "LOOP_EXHAUSTED";
}

/**
 * Posts to the in-app /api/chat route and returns the assistant text.
 * Throws `ChatError` so callers can retry or fall back deterministically.
 */
async function callChat(payload: {
  messages: ChatMessage[];
  mode: "intake" | "extract";
}): Promise<{ text: string; toolsExecuted: string[] }> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new ChatError("network", e instanceof Error ? e.message : String(e));
  }

  let data: ChatEnvelope | null = null;
  try {
    data = (await res.json()) as ChatEnvelope;
  } catch {
    throw new ChatError("bad-shape", `Non-JSON response (HTTP ${res.status})`);
  }

  if (!data || typeof data !== "object") {
    throw new ChatError("bad-shape", `Empty response (HTTP ${res.status})`);
  }

  if (!data.ok) {
    const kind = data.error_kind;
    if (kind === "ANTHROPIC_AUTH" || kind === "BAD_REQUEST") {
      throw new ChatError("auth", data.error ?? `Auth/config failure (HTTP ${res.status})`);
    }
    if (kind === "ANTHROPIC_RATE_LIMIT") {
      throw new ChatError("rate-limit", data.error ?? "Rate-limited");
    }
    if (kind === "TOOL_EXECUTION_FAIL") {
      throw new ChatError("tool-fail", data.error ?? "Tool execution failed");
    }
    // ANTHROPIC_SERVER, LOOP_EXHAUSTED, unknown → treat as server
    throw new ChatError(
      "server",
      data.error ?? `Chat service returned HTTP ${res.status}`,
    );
  }

  const text = typeof data.text === "string" ? data.text : "";
  if (!text) throw new ChatError("bad-shape", "Chat returned empty text");
  return { text, toolsExecuted: data.tools_executed ?? [] };
}

// =============================================================================
// Public API
// =============================================================================

/** Runs a single conversational turn through /api/chat using the
 *  Carbon intake system prompt. Returns the assistant's reply plus
 *  the list of tools the server-side loop executed (so the chat UI
 *  can surface "looking up property…" status when applicable). */
export async function askCarbonIntake(
  history: ChatMessage[],
): Promise<{ text: string; toolsExecuted: string[] }> {
  return callChat({ mode: "intake", messages: history });
}

/** Runs the extraction call. Sends the full transcript as one user message
 *  with mode: "extract" so /api/chat uses the extraction system prompt
 *  and skips the tool registry. Parses the JSON response and returns
 *  the structured payload (without the conversation_full / source /
 *  timestamp envelope — caller adds those). Throws ChatError on bad
 *  shape. */
export async function extractIntakePayload(
  history: ChatMessage[],
): Promise<Omit<CarbonIntakePayload, "conversation_full" | "source" | "submitted_at" | "reference_id">> {
  const transcript = history
    .map((m) => `[${m.role}] ${m.content}`)
    .join("\n\n");

  const { text: raw } = await callChat({
    mode: "extract",
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
    throw new ChatError("bad-shape", "Extraction did not return parseable JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new ChatError("bad-shape", "Extraction returned non-object JSON");
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

  // C.S.1.7.0j — 10-field structured intake additions. All optional;
  // the extraction prompt rules omit fields the prospect didn't cover.
  if (typeof p.coverage_scope === "string") {
    out.coverage_scope = p.coverage_scope as CarbonIntakePayload["coverage_scope"];
  }
  if (typeof p.eq_exposure === "string") out.eq_exposure = p.eq_exposure;
  if (typeof p.eq_interest === "string") {
    out.eq_interest = p.eq_interest as CarbonIntakePayload["eq_interest"];
  }
  if (typeof p.flood_exposure === "string") out.flood_exposure = p.flood_exposure;
  if (typeof p.flood_interest === "string") {
    out.flood_interest = p.flood_interest as CarbonIntakePayload["flood_interest"];
  }
  if (typeof p.effective_date === "string") out.effective_date = p.effective_date;
  if (typeof p.expiring_premium === "number") out.expiring_premium = p.expiring_premium;
  if (typeof p.consent_to_share_with_markets === "boolean") {
    out.consent_to_share_with_markets = p.consent_to_share_with_markets;
  }
  if (p.handoff && typeof p.handoff === "object") {
    out.handoff = p.handoff as CarbonIntakePayload["handoff"];
  }
  if (p.portfolio && typeof p.portfolio === "object") {
    out.portfolio = p.portfolio as CarbonIntakePayload["portfolio"];
  }
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
