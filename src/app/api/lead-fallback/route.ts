import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getRawTenantConfig, getDefaultTenantId } from "@/lib/tenants/registry";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";

/**
 * Lead-fallback route — sprint C.S.1.4 / rewritten C.S.1.7.1.
 *
 * Accepts three shapes:
 *   - CarbonIntakePayload  (source: "carbon_specialty_website_chat")  — habitational COPE schema
 *   - CarbonContactPayload (source: "carbon_specialty_website_contact_form")
 *   - CarbonFormPayload    (source: "carbon_specialty_website_quote_form")
 *
 * Composes a plaintext + HTML email, surfaces every field, and sends via
 * Resend. Falls back to a console.warn log-only mode when Resend is not
 * yet configured (no FALLBACK_EMAIL_TO or RESEND_API_KEY).
 */

type AssetClass =
  | "multifamily"
  | "mixed_use"
  | "sfr_portfolio"
  | "hoa"
  | "unknown";

type ElectricalType =
  | "standard_breakers"
  | "federal_pacific_stab_lok"
  | "knob_and_tube"
  | "aluminum_branch"
  | "fuse_box"
  | "mixed"
  | "unknown";

interface LossHistoryEntry {
  year: number;
  type: string;
  approx_amount_usd: number;
}

interface IntakeBody {
  source: "carbon_specialty_website_chat";
  reference_id: string;
  submitted_at: string;
  /** Forward-compat — present when the chat is run for a non-default
   *  tenant. Absent today (single-tenant); resolved to the default. */
  tenant_id?: string;
  conversation_full?: string;
  // C.S.1.7.1 habitational COPE fields
  asset_class?: AssetClass;
  unit_count?: number;
  square_footage?: number;
  year_built?: number;
  sprinklered?: boolean;
  central_station_alarm?: boolean;
  electrical_type?: ElectricalType;
  gross_annual_rents?: number;
  effective_date?: string;
  current_carrier?: string | null;
  expiring_premium_usd?: number | null;
  loss_history_5yr?: LossHistoryEntry[];
  flood_concern_volunteered?: boolean;
  property_mgmt_disclosed?: string | null;
  construction_type?: string | null;
  named_insured?: string;
  contact?: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
  };
  consent?: boolean;
  enrichment_confirmed?: boolean;
  inquiry_trigger?: string;
  /** Present only when a hard-handoff trigger fired during the intake. */
  handoff?: {
    reason:
      | "coverage_interpretation"
      | "portfolio_tiv_over_10m"
      | "active_loss"
      | "litigation_pending"
      | "out_of_appetite";
    notes?: string;
  };
  /** Portfolio detection state. */
  portfolio?: {
    is_portfolio: boolean;
    property_count?: number;
    total_tiv_usd?: number;
  };
}

interface ContactFormBody {
  source: "carbon_specialty_website_contact_form";
  reference_id: string;
  submitted_at: string;
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
}

interface QuoteFormBody {
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

type Body = IntakeBody | ContactFormBody | QuoteFormBody;

const ASSET_LABELS: Record<AssetClass, string> = {
  multifamily: "Multifamily",
  mixed_use: "Mixed-use",
  sfr_portfolio: "SFR portfolio",
  hoa: "Condo HOA",
  unknown: "Unknown asset class",
};

const HANDOFF_LABELS: Record<
  NonNullable<IntakeBody["handoff"]>["reason"],
  string
> = {
  coverage_interpretation: "Coverage interpretation question",
  portfolio_tiv_over_10m: "Portfolio TIV > $10M",
  active_loss: "Active loss in progress",
  litigation_pending: "Litigation pending",
  out_of_appetite: "Out-of-appetite asset class",
};

const ELECTRICAL_LABELS: Record<ElectricalType, string> = {
  standard_breakers: "Standard breakers",
  federal_pacific_stab_lok: "Federal Pacific Stab-Lok (carrier flag)",
  knob_and_tube: "Knob-and-tube (carrier flag)",
  aluminum_branch: "Aluminum branch wiring (carrier flag)",
  fuse_box: "Fuse box",
  mixed: "Mixed",
  unknown: "Unknown / not disclosed",
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !body.source || !body.reference_id) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  // Tenant resolution. The chat is single-tenant today; `tenant_id` on
  // an intake payload is honored when present (forward-compat) and
  // otherwise resolves to the default. getRawTenantConfig bypasses the
  // ACTIVE_TENANTS env gate so a misconfigured env never blocks a lead.
  const tenantId =
    body.source === "carbon_specialty_website_chat" &&
    typeof body.tenant_id === "string" &&
    body.tenant_id.trim()
      ? body.tenant_id.trim()
      : getDefaultTenantId();
  const config =
    getRawTenantConfig(tenantId) ?? getRawTenantConfig(getDefaultTenantId());

  // Always log — useful in Vercel runtime logs when Resend is unconfigured
  // or in test runs. Truncate the transcript so the log line stays usable.
  const logPayload = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  if (typeof logPayload.conversation_full === "string" && logPayload.conversation_full.length > 1500) {
    logPayload.conversation_full = logPayload.conversation_full.slice(0, 1500) + "…[truncated]";
  }
  console.log("[carbon-lead]", JSON.stringify(logPayload));

  // Destination — env override first, then the tenant config's
  // notificationEmail. Never hardcoded.
  const to =
    process.env.LEAD_NOTIFICATION_EMAIL ?? config?.routing.notificationEmail ?? "";
  const apiKey = process.env.RESEND_API_KEY;

  if (!to || !apiKey) {
    console.warn(
      "[carbon-lead] Resend not fully configured (RESEND_API_KEY and/or a destination missing). Logged only.",
    );
    return NextResponse.json({
      ok: true,
      route: "logged-only",
      reference: body.reference_id,
    });
  }

  // Intake submissions render the tenant's summaryTemplate as a plain-
  // text body. Contact-form / quote-form submissions keep their
  // structured plaintext + HTML layout.
  let subject: string;
  let text: string;
  let html: string | undefined;
  if (body.source === "carbon_specialty_website_chat") {
    subject = `New intake — ${body.reference_id} — ${tenantId}`;
    text = config
      ? fillTemplate(config.output.summaryTemplate, buildIntakeSummary(body))
      : textFor(body);
  } else {
    subject = subjectFor(body);
    text = textFor(body);
    html = htmlFor(body);
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Carbon Specialty <noreply@carbonspecialty.com>",
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
    if (error) {
      console.error("[carbon-lead] Resend error:", error);
      return NextResponse.json(
        { ok: false, error: "send-failed", reference: body.reference_id },
        { status: 500 },
      );
    }
    await captureServerEvent("lead_submitted", body.reference_id, {
      tenant_id: tenantId,
      reference_id: body.reference_id,
    });
    return NextResponse.json({
      ok: true,
      messageId: data?.id ?? null,
      reference: body.reference_id,
    });
  } catch (err) {
    console.error("[carbon-lead] Resend failure:", err);
    return NextResponse.json(
      { ok: false, error: "send-failed", reference: body.reference_id },
      { status: 500 },
    );
  }
}

/* -----------------------------------------------------------------------------
 * Intake summary-template rendering (C.S.1.8)
 *
 * The tenant config carries a {{camelCase}} summaryTemplate; the intake
 * email body is that template filled with the submitted CarbonIntake-
 * Payload. Any unmatched placeholder resolves to "not provided".
 * ---------------------------------------------------------------------------*/

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) && values[key] !== ""
      ? values[key]
      : "not provided",
  );
}

function buildIntakeSummary(body: IntakeBody): Record<string, string> {
  const yesNo = (v: boolean | undefined): string =>
    typeof v === "boolean" ? (v ? "Yes" : "No") : "not provided";
  const usd = (v: number | null | undefined): string =>
    typeof v === "number" && v > 0 ? `$${v.toLocaleString("en-US")}` : "not provided";
  const num = (v: number | undefined): string =>
    typeof v === "number" && v > 0 ? v.toLocaleString("en-US") : "not provided";

  // Loss history — indented block, or a single "None reported" line.
  let lossHistory: string;
  if (Array.isArray(body.loss_history_5yr) && body.loss_history_5yr.length > 0) {
    lossHistory = body.loss_history_5yr
      .map((e) => {
        const amount =
          typeof e.approx_amount_usd === "number" && e.approx_amount_usd > 0
            ? `~$${e.approx_amount_usd.toLocaleString("en-US")}`
            : "amount n/d";
        return `  ${e.year} · ${e.type} · ${amount}`;
      })
      .join("\n");
  } else {
    lossHistory = "  None reported.";
  }

  // Agent notes — inquiry trigger, handoff state, portfolio signal.
  const notes: string[] = [];
  if (body.inquiry_trigger) notes.push(`Inquiry: ${body.inquiry_trigger}`);
  if (body.handoff) {
    notes.push(
      `HANDOFF — ${HANDOFF_LABELS[body.handoff.reason] ?? body.handoff.reason}${
        body.handoff.notes ? ` (${body.handoff.notes})` : ""
      }`,
    );
  }
  if (body.portfolio?.is_portfolio) {
    const count = body.portfolio.property_count;
    const tiv = body.portfolio.total_tiv_usd;
    notes.push(
      `Portfolio${count ? ` — ${count} properties` : ""}${
        tiv ? ` — TIV $${tiv.toLocaleString("en-US")}` : ""
      }`,
    );
  }

  return {
    referenceId: body.reference_id,
    submittedAt: body.submitted_at,
    namedInsured: body.named_insured ?? "",
    assetClass: body.asset_class ? ASSET_LABELS[body.asset_class] ?? body.asset_class : "",
    unitCount: num(body.unit_count),
    squareFootage: num(body.square_footage),
    yearBuilt:
      typeof body.year_built === "number" && body.year_built > 0
        ? String(body.year_built)
        : "not provided",
    constructionType: body.construction_type ?? "",
    sprinklered: yesNo(body.sprinklered),
    centralStationAlarm: yesNo(body.central_station_alarm),
    electricalType: body.electrical_type
      ? ELECTRICAL_LABELS[body.electrical_type] ?? body.electrical_type
      : "",
    grossAnnualRents: usd(body.gross_annual_rents),
    effectiveDate: body.effective_date ?? "",
    currentCarrier: body.current_carrier ?? "",
    expiringPremium: usd(body.expiring_premium_usd),
    consent: yesNo(body.consent),
    enrichmentConfirmed: yesNo(body.enrichment_confirmed),
    floodConcern: body.flood_concern_volunteered
      ? "Volunteered by prospect"
      : "None raised",
    propertyMgmt: body.property_mgmt_disclosed ?? "Not disclosed",
    lossHistory,
    contactName: body.contact?.name ?? "",
    contactRole: body.contact?.role ?? "",
    contactEmail: body.contact?.email ?? "",
    contactPhone: body.contact?.phone ?? "",
    agentNotes: notes.length > 0 ? notes.join("\n  ") : "—",
  };
}

// -----------------------------------------------------------------------------
// Subject + body formatting
// -----------------------------------------------------------------------------

function subjectFor(body: Body): string {
  if (body.source === "carbon_specialty_website_contact_form") {
    return `Carbon Specialty — Contact form · ${body.reference_id}`;
  }
  if (body.source === "carbon_specialty_website_quote_form") {
    const asset = body.asset_class ?? "Unknown asset";
    const where = body.address ?? "";
    return `Carbon Specialty — Quote form: ${asset}${where ? ` · ${where}` : ""} · ${body.reference_id}`;
  }
  const asset = body.asset_class ? ASSET_LABELS[body.asset_class] : "Unknown asset";
  const insured = body.named_insured ? ` — ${body.named_insured}` : "";
  return `Carbon Specialty — New Intake: ${asset}${insured} · ${body.reference_id}`;
}

function textFor(body: Body): string {
  const lines: string[] = [];
  lines.push(`Reference: ${body.reference_id}`);
  lines.push(`Submitted: ${body.submitted_at}`);
  lines.push(`Source: ${body.source}`);
  lines.push("");

  if (body.source === "carbon_specialty_website_contact_form") {
    lines.push("--- Contact form ---");
    if (body.name) lines.push(`Name:  ${body.name}`);
    if (body.email) lines.push(`Email: ${body.email}`);
    if (body.phone) lines.push(`Phone: ${body.phone}`);
    if (body.note) {
      lines.push("");
      lines.push("Note:");
      lines.push(body.note);
    }
    return lines.join("\n");
  }

  if (body.source === "carbon_specialty_website_quote_form") {
    lines.push("--- Quote form ---");
    if (body.asset_class) lines.push(`Asset class:    ${body.asset_class}`);
    if (body.address) lines.push(`Address:        ${body.address}`);
    if (body.units) lines.push(`Units:          ${body.units}`);
    if (body.year_built) lines.push(`Year built:     ${body.year_built}`);
    if (body.valuation) lines.push(`Valuation:      ${body.valuation}`);
    if (body.entity) lines.push(`Owner entity:   ${body.entity}`);
    if (body.coverages?.length) lines.push(`Coverages:      ${body.coverages.join(", ")}`);
    lines.push("");
    lines.push("--- Contact ---");
    if (body.contact_name) lines.push(`Name:           ${body.contact_name}`);
    if (body.email) lines.push(`Email:          ${body.email}`);
    if (body.phone) lines.push(`Phone:          ${body.phone}`);
    return lines.join("\n");
  }

  // Handoff surfaces above everything else.
  if (body.handoff) {
    lines.push("--- HANDOFF: SPECIALIST REQUIRED ---");
    lines.push(`Reason:            ${HANDOFF_LABELS[body.handoff.reason] ?? body.handoff.reason}`);
    if (body.handoff.notes) lines.push(`Trigger phrase:    ${body.handoff.notes}`);
    lines.push("");
  }

  if (body.portfolio?.is_portfolio) {
    lines.push("--- Portfolio ---");
    if (typeof body.portfolio.property_count === "number") {
      lines.push(`Property count:    ${body.portfolio.property_count}`);
    }
    if (typeof body.portfolio.total_tiv_usd === "number") {
      lines.push(`Total TIV:         $${body.portfolio.total_tiv_usd.toLocaleString("en-US")}`);
    }
    lines.push("");
  }

  // Habitational COPE submission
  lines.push("--- Submission (Habitational COPE) ---");
  if (body.asset_class) lines.push(`Asset class:       ${ASSET_LABELS[body.asset_class] ?? body.asset_class}`);
  if (body.named_insured) lines.push(`Named insured:     ${body.named_insured}`);
  if (typeof body.unit_count === "number") lines.push(`Unit count:        ${body.unit_count}`);
  if (typeof body.square_footage === "number") lines.push(`Square footage:    ${body.square_footage.toLocaleString("en-US")}`);
  if (typeof body.year_built === "number") lines.push(`Year built:        ${body.year_built}`);
  if (body.construction_type) lines.push(`Construction:      ${body.construction_type}`);
  if (typeof body.sprinklered === "boolean") lines.push(`Sprinklered:       ${body.sprinklered ? "Yes" : "No"}`);
  if (typeof body.central_station_alarm === "boolean") {
    lines.push(`Central alarm:     ${body.central_station_alarm ? "Yes" : "No"}`);
  }
  if (body.electrical_type) lines.push(`Electrical:        ${ELECTRICAL_LABELS[body.electrical_type] ?? body.electrical_type}`);
  if (typeof body.gross_annual_rents === "number") {
    lines.push(`Gross annual rents: $${body.gross_annual_rents.toLocaleString("en-US")}`);
  }
  if (body.effective_date) lines.push(`Effective date:    ${body.effective_date}`);
  if (body.current_carrier) lines.push(`Current carrier:   ${body.current_carrier}`);
  if (typeof body.expiring_premium_usd === "number") {
    lines.push(`Expiring premium:  $${body.expiring_premium_usd.toLocaleString("en-US")}`);
  }
  if (typeof body.consent === "boolean") {
    lines.push(`Markets consent:   ${body.consent ? "Yes" : "No (hold for review)"}`);
  }
  if (typeof body.enrichment_confirmed === "boolean") {
    lines.push(`Enrichment confirmed: ${body.enrichment_confirmed ? "Yes" : "No"}`);
  }
  if (body.flood_concern_volunteered) {
    lines.push(`Flood concern:     Volunteered by prospect (passive-listener flag)`);
  }
  if (body.property_mgmt_disclosed) {
    lines.push(`Property mgmt:     ${body.property_mgmt_disclosed}`);
  }
  if (body.inquiry_trigger) lines.push(`Inquiry trigger:   ${body.inquiry_trigger}`);

  if (Array.isArray(body.loss_history_5yr) && body.loss_history_5yr.length > 0) {
    lines.push("");
    lines.push("--- Loss history (self-reported, 5yr) ---");
    for (const entry of body.loss_history_5yr) {
      const amount = typeof entry.approx_amount_usd === "number"
        ? `~$${entry.approx_amount_usd.toLocaleString("en-US")}`
        : "amount n/d";
      lines.push(`  ${entry.year} · ${entry.type} · ${amount}`);
    }
    lines.push("");
    lines.push("Loss runs to be gathered post-handoff by the specialist.");
  } else if (Array.isArray(body.loss_history_5yr)) {
    lines.push("");
    lines.push("Loss history (5yr): None reported.");
  }

  if (body.contact) {
    lines.push("");
    lines.push("--- Contact ---");
    if (body.contact.name) lines.push(`Name:              ${body.contact.name}`);
    if (body.contact.role) lines.push(`Role:              ${body.contact.role}`);
    if (body.contact.email) lines.push(`Email:             ${body.contact.email}`);
    if (body.contact.phone) lines.push(`Phone:             ${body.contact.phone}`);
  }

  if (body.conversation_full) {
    lines.push("");
    lines.push("--- Full transcript ---");
    lines.push(body.conversation_full);
  }

  return lines.join("\n");
}

function htmlFor(body: Body): string {
  // Print-style HTML — single table, no inlined fonts, no shadows. Editorial.
  const styles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #F5F2EC;
    color: #0B0B0C;
    padding: 32px;
  `;
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:6px 0; vertical-align:top; width:180px; font-family:monospace; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#6E6E72;">${label}</td><td style="padding:6px 0; color:#0B0B0C; font-size:14px;">${escapeHtml(value)}</td></tr>`
      : "";

  if (body.source === "carbon_specialty_website_contact_form") {
    return `<!DOCTYPE html><html><body style="${styles}">
      <div style="max-width:640px;margin:0 auto;">
        <p style="font-family:monospace; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#1F4D38;">Carbon Specialty · Contact form</p>
        <h1 style="font-family:Georgia,serif; font-weight:400; font-size:28px; margin:8px 0 24px; letter-spacing:-0.02em;">New contact-form submission</h1>
        <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C; border-bottom:1px solid #0B0B0C;">
          ${row("Reference", body.reference_id)}
          ${row("Submitted", body.submitted_at)}
          ${row("Name", body.name)}
          ${row("Email", body.email)}
          ${row("Phone", body.phone)}
        </table>
        ${body.note ? `<h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Note</h3><p style="white-space:pre-wrap; font-size:14px; line-height:1.6;">${escapeHtml(body.note)}</p>` : ""}
      </div>
    </body></html>`;
  }

  if (body.source === "carbon_specialty_website_quote_form") {
    return `<!DOCTYPE html><html><body style="${styles}">
      <div style="max-width:640px;margin:0 auto;">
        <p style="font-family:monospace; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#1F4D38;">Carbon Specialty · Quote form</p>
        <h1 style="font-family:Georgia,serif; font-weight:400; font-size:28px; margin:8px 0 24px; letter-spacing:-0.02em;">${escapeHtml(body.asset_class ?? "Quote form submission")}</h1>
        <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C;">
          ${row("Reference", body.reference_id)}
          ${row("Submitted", body.submitted_at)}
          ${row("Asset class", body.asset_class)}
          ${row("Address", body.address)}
          ${row("Units", body.units)}
          ${row("Year built", body.year_built)}
          ${row("Valuation", body.valuation)}
          ${row("Owner entity", body.entity)}
          ${row("Coverages", body.coverages?.join(", "))}
        </table>
        <h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Contact</h3>
        <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C; border-bottom:1px solid #0B0B0C;">
          ${row("Name", body.contact_name)}
          ${row("Email", body.email)}
          ${row("Phone", body.phone)}
        </table>
      </div>
    </body></html>`;
  }

  const asset = body.asset_class ? ASSET_LABELS[body.asset_class] : "Unknown";

  const handoffBlock = body.handoff
    ? `<div style="border:2px solid #B33A2A; background:#FBEBE8; padding:16px; margin:0 0 24px;">
        <p style="font-family:monospace; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#B33A2A; margin:0 0 8px;">Handoff: specialist required</p>
        <h2 style="font-family:Georgia,serif; font-weight:400; font-size:20px; margin:0 0 8px;">${escapeHtml(
          HANDOFF_LABELS[body.handoff.reason] ?? body.handoff.reason,
        )}</h2>
        ${body.handoff.notes ? `<p style="font-size:13px; color:#2A2A2D; margin:0;">Trigger phrase: <em>"${escapeHtml(body.handoff.notes)}"</em></p>` : ""}
      </div>`
    : "";

  const portfolioBlock = body.portfolio?.is_portfolio
    ? `<h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Portfolio</h3>
       <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C; border-bottom:1px solid #0B0B0C;">
         ${row("Property count", body.portfolio.property_count?.toString())}
         ${row("Total TIV", body.portfolio.total_tiv_usd ? `$${body.portfolio.total_tiv_usd.toLocaleString("en-US")}` : undefined)}
       </table>`
    : "";

  const lossBlock =
    Array.isArray(body.loss_history_5yr) && body.loss_history_5yr.length > 0
      ? `<h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Loss history (self-reported, 5yr)</h3>
         <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C; border-bottom:1px solid #0B0B0C;">
           ${body.loss_history_5yr
             .map(
               (e) =>
                 `<tr><td style="padding:6px 12px 6px 0; font-family:monospace; font-size:12px; color:#6E6E72;">${e.year}</td><td style="padding:6px 0; font-size:14px;">${escapeHtml(e.type)}</td><td style="padding:6px 0; font-size:14px; text-align:right;">~$${e.approx_amount_usd.toLocaleString("en-US")}</td></tr>`,
             )
             .join("")}
         </table>
         <p style="font-size:12px; color:#6E6E72; margin:8px 0 0; font-style:italic;">Loss runs to be gathered post-handoff by the specialist.</p>`
      : Array.isArray(body.loss_history_5yr)
      ? `<p style="font-size:13px; color:#2A2A2D; margin-top:16px;">Loss history (5yr): None reported.</p>`
      : "";

  return `<!DOCTYPE html><html><body style="${styles}">
    <div style="max-width:640px;margin:0 auto;">
      <p style="font-family:monospace; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#1F4D38;">Carbon Specialty · New intake (Habitational COPE)</p>
      <h1 style="font-family:Georgia,serif; font-weight:400; font-size:28px; margin:8px 0 24px; letter-spacing:-0.02em;">${escapeHtml(asset)}${body.named_insured ? ` <em>— ${escapeHtml(body.named_insured)}</em>` : ""}</h1>
      ${handoffBlock}
      <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C;">
        ${row("Reference", body.reference_id)}
        ${row("Submitted", body.submitted_at)}
        ${row("Asset class", asset)}
        ${row("Named insured", body.named_insured)}
        ${row("Unit count", body.unit_count?.toString())}
        ${row("Square footage", typeof body.square_footage === "number" ? body.square_footage.toLocaleString("en-US") : undefined)}
        ${row("Year built", body.year_built?.toString())}
        ${row("Construction", body.construction_type ?? undefined)}
        ${row("Sprinklered", typeof body.sprinklered === "boolean" ? (body.sprinklered ? "Yes" : "No") : undefined)}
        ${row("Central alarm", typeof body.central_station_alarm === "boolean" ? (body.central_station_alarm ? "Yes" : "No") : undefined)}
        ${row("Electrical", body.electrical_type ? ELECTRICAL_LABELS[body.electrical_type] : undefined)}
        ${row("Gross annual rents", typeof body.gross_annual_rents === "number" ? `$${body.gross_annual_rents.toLocaleString("en-US")}` : undefined)}
        ${row("Effective date", body.effective_date)}
        ${row("Current carrier", body.current_carrier ?? undefined)}
        ${row("Expiring premium", typeof body.expiring_premium_usd === "number" ? `$${body.expiring_premium_usd.toLocaleString("en-US")}` : undefined)}
        ${row("Markets consent", typeof body.consent === "boolean" ? (body.consent ? "Yes" : "No (hold for review)") : undefined)}
        ${row("Enrichment confirmed", typeof body.enrichment_confirmed === "boolean" ? (body.enrichment_confirmed ? "Yes" : "No") : undefined)}
        ${row("Flood concern", body.flood_concern_volunteered ? "Volunteered (passive-listener)" : undefined)}
        ${row("Property mgmt", body.property_mgmt_disclosed ?? undefined)}
        ${row("Inquiry trigger", body.inquiry_trigger)}
      </table>
      ${portfolioBlock}
      ${lossBlock}
      <h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Contact</h3>
      <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C; border-bottom:1px solid #0B0B0C;">
        ${row("Name", body.contact?.name)}
        ${row("Role", body.contact?.role)}
        ${row("Email", body.contact?.email)}
        ${row("Phone", body.contact?.phone)}
      </table>
      ${
        body.conversation_full
          ? `<h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Transcript</h3>
             <pre style="white-space:pre-wrap; font-family:monospace; font-size:12px; line-height:1.55; background:#EAE5DB; padding:16px; border:1px solid #0B0B0C; color:#2A2A2D; max-height:480px; overflow:auto;">${escapeHtml(body.conversation_full)}</pre>`
          : ""
      }
    </div>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
