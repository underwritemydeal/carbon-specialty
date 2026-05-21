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

/** C.S.1.7.0j → C.S.1.7.0k — handoff trigger categories. When the
 *  intake prompt fires a hard-handoff, the extraction step encodes the
 *  reason here so the specialist queue email surfaces it prominently. */
export type HandoffReason =
  | "coverage_interpretation"
  | "portfolio_tiv_over_10m"
  | "active_loss"
  | "litigation_pending"
  | "out_of_appetite";

/** C.S.1.7.1 — habitational asset class union (collapsed from the
 *  C.S.1.7.0 seven-class set). Out of appetite: condo units, small
 *  commercial RE, builders risk. */
export type AssetClass =
  | "multifamily"
  | "mixed_use"
  | "sfr_portfolio"
  | "hoa"
  | "unknown";

/** C.S.1.7.1 — electrical service type. The three middle values
 *  (federal_pacific_stab_lok, knob_and_tube, aluminum_branch) are
 *  carrier-killer signals on habitational risks; surfacing them at
 *  intake lets a specialist match the submission to a market that
 *  will entertain it. */
export type ElectricalType =
  | "standard_breakers"
  | "federal_pacific_stab_lok"
  | "knob_and_tube"
  | "aluminum_branch"
  | "fuse_box"
  | "mixed"
  | "unknown";

/** C.S.1.7.1 — self-reported claim entry from the 5-year loss history
 *  question. Loss runs are gathered post-handoff by the specialist;
 *  intake captures only what the prospect can recall. */
export interface LossHistoryEntry {
  year: number;
  type: string;
  approx_amount_usd: number;
}

/** C.S.1.7.1 — habitational COPE intake payload.
 *
 *  Replaces the C.S.1.7.0j/0k 10-field schema. The 8-turn habitational
 *  COPE flow surfaces underwriting-grade signals (sprinklered, central
 *  station alarm, electrical service type, gross annual rents) and
 *  drops the abstract coverage_scope / eq_interest / flood_interest
 *  unions — those gather more usefully as passive-listener fields or
 *  not at all, since the placement specialist will work them out
 *  during post-handoff.
 *
 *  Construction type is populated from enrich_property's parcel data
 *  and is NEVER user-asked (typing "wood frame" doesn't help an
 *  underwriter — the parcel record does, and Carbon's construction-
 *  sanity layer in C.S.1.7.0e flags suspicious county codes). */
export interface CarbonIntakePayload {
  asset_class: AssetClass;
  unit_count: number;
  square_footage: number;
  year_built: number;
  sprinklered: boolean;
  central_station_alarm: boolean;
  electrical_type: ElectricalType;
  gross_annual_rents: number;
  effective_date: string;
  current_carrier: string | null;
  expiring_premium_usd: number | null;
  loss_history_5yr: LossHistoryEntry[];
  /** Passive listener — true when the prospect raised flood / FEMA /
   *  water-intrusion concern at any point. Carbon does NOT proactively
   *  ask about flood in the habitational COPE sequence. */
  flood_concern_volunteered: boolean;
  /** Passive listener — string description of any third-party property
   *  manager the prospect mentioned (e.g. "Greystar runs the property").
   *  null when no third-party PM was disclosed. */
  property_mgmt_disclosed: string | null;
  /** Populated by enrich_property; never asked of the user. null when
   *  enrichment was unavailable or the construction code was flagged
   *  unreliable by the construction-sanity layer. */
  construction_type: string | null;
  /** Entity on the dec page (e.g. "ACME Holdings LLC"). Distinct from
   *  contact.name (the human reaching out). */
  named_insured: string;
  contact: {
    name: string;
    role: string;
    email: string;
    phone: string;
  };
  consent: boolean;
  /** Flips to true once the model has surfaced the enrich_property
   *  facts in the Turn 2 confirmation message and the prospect has
   *  confirmed or corrected them. */
  enrichment_confirmed: boolean;

  /** Inquiry trigger (preserved from prior schemas — a single phrase
   *  capturing why the prospect reached out). */
  inquiry_trigger?: string;

  /** Handoff state — present only when one of the five hard-handoff
   *  triggers fired during the intake; absent otherwise. When present,
   *  the wrap-up sentinel was NOT emitted and the conversation ended
   *  at the handoff. */
  handoff?: {
    reason: HandoffReason;
    notes?: string;
  };

  /** Portfolio detection state — present when the prospect signaled a
   *  multi-property situation. */
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
  disclaimers_applied?: string[];
  /** Extract-mode only — the structured CarbonIntakePayload returned
   *  directly off the model's forced tool-use args. */
  payload?: Record<string, unknown>;
  error?: string;
  error_kind?:
    | "BAD_REQUEST"
    | "ANTHROPIC_AUTH"
    | "ANTHROPIC_RATE_LIMIT"
    | "ANTHROPIC_SERVER"
    | "TOOL_EXECUTION_FAIL"
    | "LOOP_EXHAUSTED"
    | "EXTRACT_NO_TOOL_USE";
}

/**
 * Posts to the in-app /api/chat route. Returns either the assistant
 * text (intake mode) or the structured payload (extract mode) depending
 * on which mode was requested. Throws `ChatError` on failure.
 */
async function callChat(payload: {
  messages: ChatMessage[];
  mode: "intake" | "extract";
}): Promise<{
  text: string;
  toolsExecuted: string[];
  payload?: Record<string, unknown>;
}> {
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
    // ANTHROPIC_SERVER, LOOP_EXHAUSTED, EXTRACT_NO_TOOL_USE, unknown → treat as server
    throw new ChatError(
      "server",
      data.error ?? `Chat service returned HTTP ${res.status}`,
    );
  }

  // Extract mode returns a structured payload, not text. Intake mode
  // returns text. Allow either; the caller decides which to use.
  const text = typeof data.text === "string" ? data.text : "";
  const structured =
    data.payload && typeof data.payload === "object" ? data.payload : undefined;

  if (payload.mode === "extract") {
    if (!structured) throw new ChatError("bad-shape", "Extract returned no structured payload");
    return { text: "", toolsExecuted: data.tools_executed ?? [], payload: structured };
  }

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
 *  with mode: "extract" so /api/chat forces a tool-use of `extract_intake`
 *  and returns the structured CarbonIntakePayload directly off the
 *  model's tool args. No JSON parsing on the client — the route reads
 *  tool_use.input and returns it as `payload`. Throws ChatError on bad
 *  shape. */
export async function extractIntakePayload(
  history: ChatMessage[],
): Promise<Omit<CarbonIntakePayload, "conversation_full" | "source" | "submitted_at" | "reference_id">> {
  const transcript = history
    .map((m) => `[${m.role}] ${m.content}`)
    .join("\n\n");

  const { payload: structured } = await callChat({
    mode: "extract",
    messages: [{ role: "user", content: `Transcript:\n\n${transcript}` }],
  });

  if (!structured) {
    throw new ChatError("bad-shape", "Extraction returned no structured payload");
  }

  // C.S.1.7.1 normalizer — habitational COPE schema. Missing fields
  // default conservatively (booleans → false, strings → "", numbers → 0,
  // arrays → []) so downstream consumers (Resend email body) never
  // crash on undefined. The handoff path may legitimately produce an
  // intake that's mostly empty when a trigger fires early; the email
  // template surfaces which fields the prospect actually filled.
  const p = structured;
  const contactRaw = (p.contact ?? {}) as Record<string, unknown>;
  const lossRaw = Array.isArray(p.loss_history_5yr) ? p.loss_history_5yr : [];

  const out: Omit<
    CarbonIntakePayload,
    "conversation_full" | "source" | "submitted_at" | "reference_id"
  > = {
    asset_class: (p.asset_class as AssetClass) ?? "unknown",
    unit_count: typeof p.unit_count === "number" ? p.unit_count : 0,
    square_footage: typeof p.square_footage === "number" ? p.square_footage : 0,
    year_built: typeof p.year_built === "number" ? p.year_built : 0,
    sprinklered: typeof p.sprinklered === "boolean" ? p.sprinklered : false,
    central_station_alarm:
      typeof p.central_station_alarm === "boolean" ? p.central_station_alarm : false,
    electrical_type: (p.electrical_type as ElectricalType) ?? "unknown",
    gross_annual_rents: typeof p.gross_annual_rents === "number" ? p.gross_annual_rents : 0,
    effective_date: typeof p.effective_date === "string" ? p.effective_date : "",
    current_carrier:
      typeof p.current_carrier === "string" ? p.current_carrier : null,
    expiring_premium_usd:
      typeof p.expiring_premium_usd === "number" ? p.expiring_premium_usd : null,
    loss_history_5yr: lossRaw
      .map((e) => e as Record<string, unknown>)
      .filter((e) => typeof e?.year === "number" && typeof e?.type === "string")
      .map((e) => ({
        year: e.year as number,
        type: e.type as string,
        approx_amount_usd:
          typeof e.approx_amount_usd === "number" ? (e.approx_amount_usd as number) : 0,
      })),
    flood_concern_volunteered:
      typeof p.flood_concern_volunteered === "boolean" ? p.flood_concern_volunteered : false,
    property_mgmt_disclosed:
      typeof p.property_mgmt_disclosed === "string" ? p.property_mgmt_disclosed : null,
    construction_type:
      typeof p.construction_type === "string" ? p.construction_type : null,
    named_insured: typeof p.named_insured === "string" ? p.named_insured : "",
    contact: {
      name: typeof contactRaw.name === "string" ? contactRaw.name : "",
      role: typeof contactRaw.role === "string" ? contactRaw.role : "",
      email: typeof contactRaw.email === "string" ? contactRaw.email : "",
      phone: typeof contactRaw.phone === "string" ? contactRaw.phone : "",
    },
    consent: typeof p.consent === "boolean" ? p.consent : false,
    enrichment_confirmed:
      typeof p.enrichment_confirmed === "boolean" ? p.enrichment_confirmed : false,
  };
  if (typeof p.inquiry_trigger === "string") out.inquiry_trigger = p.inquiry_trigger;
  if (p.handoff && typeof p.handoff === "object") {
    out.handoff = p.handoff as CarbonIntakePayload["handoff"];
  }
  if (p.portfolio && typeof p.portfolio === "object") {
    out.portfolio = p.portfolio as CarbonIntakePayload["portfolio"];
  }
  return out;
}

/** Persists the lead by POSTing to the in-app /api/lead-fallback route,
 *  which formats the email and sends via Resend.
 *
 *  C.S.1.8 — the NEXT_PUBLIC_LEADS_ENDPOINT_READY / Covr-Worker branch
 *  was removed. Every submission goes straight to /api/lead-fallback;
 *  that route degrades gracefully on its own when RESEND_API_KEY is
 *  unset (logs the payload, returns 200), so there is nothing to gate
 *  on the client. Returns { ok, route, reference }. */
export async function submitIntake(
  payload: LeadPayload,
): Promise<{ ok: boolean; route: "fallback-email"; reference: string }> {
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
