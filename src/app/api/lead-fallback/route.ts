import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

/**
 * Lead-fallback route — sprint C.S.1.4.
 *
 * Accepts two shapes:
 *   - CarbonIntakePayload  (source: "carbon_specialty_website_chat")
 *   - CarbonContactPayload (source: "carbon_specialty_website_contact_form")
 *
 * Composes a plaintext + HTML email, surfaces every field, and sends via
 * Resend. Falls back to a console.warn log-only mode when Resend is not
 * yet configured (no FALLBACK_EMAIL_TO or RESEND_API_KEY).
 */

type AssetType =
  | "multifamily"
  | "mixed_use"
  | "sfr_portfolio"
  | "hoa"
  | "condo_unit"
  | "small_commercial_re"
  | "builders_risk"
  | "unknown";

interface IntakeBody {
  source: "carbon_specialty_website_chat";
  reference_id: string;
  submitted_at: string;
  conversation_full?: string;
  asset_type?: AssetType;
  location?: { city?: string; state?: string; address?: string };
  unit_count?: number;
  year_built?: number;
  construction_type?: string;
  // C.S.1.7.0j — 10-field structured intake additions:
  coverage_scope?: "property_only" | "property_liability" | "full_package" | "unknown";
  eq_exposure?: string;
  eq_interest?: "currently_carry" | "looking_to_add" | "not_interested" | "unknown";
  flood_exposure?: string;
  flood_interest?: "currently_carry" | "looking_to_add" | "not_interested" | "unknown";
  loss_history_summary?: string;
  effective_date?: string;
  current_carrier?: string;
  current_expiration?: string;
  expiring_premium?: number;
  consent_to_share_with_markets?: boolean;
  inquiry_trigger?: string;
  contact?: {
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
  /** C.S.1.7.0j — present only when a hard-handoff trigger fired during
   *  the intake. When present, the specialist queue email surfaces it
   *  prominently above the standard fields. */
  handoff?: {
    reason:
      | "coverage_interpretation"
      | "portfolio_tiv_over_10m"
      | "active_loss"
      | "litigation_pending";
    notes?: string;
  };
  /** C.S.1.7.0j — portfolio detection state. Present when the prospect
   *  signaled multiple properties. total_tiv_usd is numeric so the routing
   *  layer can apply the $10M threshold (handoff trigger #2). */
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

const ASSET_LABELS: Record<AssetType, string> = {
  multifamily: "Multifamily",
  mixed_use: "Mixed-use",
  sfr_portfolio: "SFR portfolio",
  hoa: "Condo HOA",
  condo_unit: "Single condo unit",
  small_commercial_re: "Small commercial real estate",
  builders_risk: "Builders risk",
  unknown: "Unknown asset type",
};

const HANDOFF_LABELS: Record<
  NonNullable<IntakeBody["handoff"]>["reason"],
  string
> = {
  coverage_interpretation: "Coverage interpretation question",
  portfolio_tiv_over_10m: "Portfolio TIV > $10M",
  active_loss: "Active loss in progress",
  litigation_pending: "Litigation pending",
};

const COVERAGE_SCOPE_LABELS: Record<
  NonNullable<IntakeBody["coverage_scope"]>,
  string
> = {
  property_only: "Property only",
  property_liability: "Property + liability",
  full_package: "Full package (incl. EPLI / D&O / umbrella)",
  unknown: "Unknown",
};

const PERIL_INTEREST_LABELS: Record<
  NonNullable<IntakeBody["eq_interest"]>,
  string
> = {
  currently_carry: "Currently carries",
  looking_to_add: "Looking to add",
  not_interested: "Not interested",
  unknown: "Unknown",
};

const CONTACT_ROLE_LABELS: Record<
  NonNullable<NonNullable<IntakeBody["contact"]>["role"]>,
  string
> = {
  owner: "Owner",
  asset_manager: "Asset manager",
  property_manager: "Property manager",
  broker_referral: "Broker referral",
  other: "Other",
  unknown: "Unknown",
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !body.source || !body.reference_id) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  // Always log — useful in Vercel runtime logs when Resend is unconfigured
  // or in test runs. Truncate the transcript so the log line stays usable.
  const logPayload = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  if (typeof logPayload.conversation_full === "string" && logPayload.conversation_full.length > 1500) {
    logPayload.conversation_full = logPayload.conversation_full.slice(0, 1500) + "…[truncated]";
  }
  console.log("[carbon-lead]", JSON.stringify(logPayload));

  const to = process.env.FALLBACK_EMAIL_TO;
  const apiKey = process.env.RESEND_API_KEY;

  if (!to || !apiKey) {
    console.warn(
      "[carbon-lead] Resend is not configured (FALLBACK_EMAIL_TO and/or RESEND_API_KEY missing). Logged only.",
    );
    return NextResponse.json({
      ok: true,
      route: "logged-only",
      reference: body.reference_id,
    });
  }

  const subject = subjectFor(body);
  const text = textFor(body);
  const html = htmlFor(body);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Carbon Specialty <noreply@carbonspecialty.com>",
      to,
      subject,
      text,
      html,
    });
    return NextResponse.json({
      ok: true,
      route: "fallback-email",
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
  const asset = body.asset_type ? ASSET_LABELS[body.asset_type] : "Unknown asset";
  const where = locationLabel(body.location);
  return `Carbon Specialty — New Intake: ${asset}${where ? ` in ${where}` : ""} · ${body.reference_id}`;
}

function locationLabel(loc?: IntakeBody["location"]): string {
  if (!loc) return "";
  if (loc.city && loc.state) return `${loc.city}, ${loc.state}`;
  if (loc.city) return loc.city;
  if (loc.state) return loc.state;
  if (loc.address) return loc.address;
  return "";
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

  // C.S.1.7.0j — handoff surfaces above everything else. When present,
  // a specialist needs to act on this lead immediately rather than
  // treating it as a standard intake.
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

  // Intake payload
  lines.push("--- Submission ---");
  if (body.asset_type) lines.push(`Asset type:        ${ASSET_LABELS[body.asset_type] ?? body.asset_type}`);
  const loc = locationLabel(body.location);
  if (loc) lines.push(`Location:          ${loc}`);
  if (body.location?.address) lines.push(`Address:           ${body.location.address}`);
  if (typeof body.unit_count === "number") lines.push(`Unit count:        ${body.unit_count}`);
  if (typeof body.year_built === "number") lines.push(`Year built:        ${body.year_built}`);
  if (body.construction_type) lines.push(`Construction:      ${body.construction_type}`);
  if (body.coverage_scope) {
    lines.push(`Coverage scope:    ${COVERAGE_SCOPE_LABELS[body.coverage_scope] ?? body.coverage_scope}`);
  }
  if (body.eq_exposure || body.eq_interest) {
    const exposure = body.eq_exposure ?? "—";
    const interest = body.eq_interest
      ? PERIL_INTEREST_LABELS[body.eq_interest] ?? body.eq_interest
      : "—";
    lines.push(`Earthquake:        ${exposure} · ${interest}`);
  }
  if (body.flood_exposure || body.flood_interest) {
    const exposure = body.flood_exposure ?? "—";
    const interest = body.flood_interest
      ? PERIL_INTEREST_LABELS[body.flood_interest] ?? body.flood_interest
      : "—";
    lines.push(`Flood:             ${exposure} · ${interest}`);
  }
  if (body.loss_history_summary) lines.push(`Loss history:      ${body.loss_history_summary}`);
  if (body.effective_date) lines.push(`Effective date:    ${body.effective_date}`);
  if (body.current_carrier) lines.push(`Current carrier:   ${body.current_carrier}`);
  if (body.current_expiration) lines.push(`Expiration:        ${body.current_expiration}`);
  if (typeof body.expiring_premium === "number") {
    lines.push(`Expiring premium:  $${body.expiring_premium.toLocaleString("en-US")}`);
  }
  if (typeof body.consent_to_share_with_markets === "boolean") {
    lines.push(`Markets consent:   ${body.consent_to_share_with_markets ? "Yes" : "No (hold for review)"}`);
  }
  if (body.inquiry_trigger) lines.push(`Inquiry trigger:   ${body.inquiry_trigger}`);

  if (body.contact) {
    lines.push("");
    lines.push("--- Contact ---");
    if (body.contact.name) lines.push(`Name:              ${body.contact.name}`);
    if (body.contact.email) lines.push(`Email:             ${body.contact.email}`);
    if (body.contact.phone) lines.push(`Phone:             ${body.contact.phone}`);
    if (body.contact.role)
      lines.push(`Role:              ${CONTACT_ROLE_LABELS[body.contact.role] ?? body.contact.role}`);
    if (body.contact.preferred_method)
      lines.push(`Preferred method:  ${body.contact.preferred_method}`);
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

  const asset = body.asset_type ? ASSET_LABELS[body.asset_type] : "Unknown";
  const loc = locationLabel(body.location);

  // C.S.1.7.0j — handoff callout. Surfaces above the standard intake
  // table when present so the specialist sees the trigger before any
  // other field. Uses the ember/red palette (#B33A2A) so it visually
  // separates from the editorial intake content.
  const handoffBlock = body.handoff
    ? `<div style="border:2px solid #B33A2A; background:#FBEBE8; padding:16px; margin:0 0 24px;">
        <p style="font-family:monospace; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#B33A2A; margin:0 0 8px;">Handoff: specialist required</p>
        <h2 style="font-family:Georgia,serif; font-weight:400; font-size:20px; margin:0 0 8px;">${escapeHtml(
          HANDOFF_LABELS[body.handoff.reason] ?? body.handoff.reason,
        )}</h2>
        ${body.handoff.notes ? `<p style="font-size:13px; color:#2A2A2D; margin:0;">Trigger phrase: <em>"${escapeHtml(body.handoff.notes)}"</em></p>` : ""}
      </div>`
    : "";

  // C.S.1.7.0j — portfolio summary if signaled.
  const portfolioBlock = body.portfolio?.is_portfolio
    ? `<h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Portfolio</h3>
       <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C; border-bottom:1px solid #0B0B0C;">
         ${row("Property count", body.portfolio.property_count?.toString())}
         ${row("Total TIV", body.portfolio.total_tiv_usd ? `$${body.portfolio.total_tiv_usd.toLocaleString("en-US")}` : undefined)}
       </table>`
    : "";

  return `<!DOCTYPE html><html><body style="${styles}">
    <div style="max-width:640px;margin:0 auto;">
      <p style="font-family:monospace; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:#1F4D38;">Carbon Specialty · New intake</p>
      <h1 style="font-family:Georgia,serif; font-weight:400; font-size:28px; margin:8px 0 24px; letter-spacing:-0.02em;">${escapeHtml(asset)}${loc ? ` <em>in ${escapeHtml(loc)}</em>` : ""}</h1>
      ${handoffBlock}
      <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C;">
        ${row("Reference", body.reference_id)}
        ${row("Submitted", body.submitted_at)}
        ${row("Asset type", asset)}
        ${row("Location", loc)}
        ${row("Address", body.location?.address)}
        ${row("Unit count", body.unit_count?.toString())}
        ${row("Year built", body.year_built?.toString())}
        ${row("Construction", body.construction_type)}
        ${row("Coverage scope", body.coverage_scope ? COVERAGE_SCOPE_LABELS[body.coverage_scope] : undefined)}
        ${row("Earthquake", body.eq_exposure || body.eq_interest ? `${body.eq_exposure ?? "—"} · ${body.eq_interest ? PERIL_INTEREST_LABELS[body.eq_interest] : "—"}` : undefined)}
        ${row("Flood", body.flood_exposure || body.flood_interest ? `${body.flood_exposure ?? "—"} · ${body.flood_interest ? PERIL_INTEREST_LABELS[body.flood_interest] : "—"}` : undefined)}
        ${row("Loss history", body.loss_history_summary)}
        ${row("Effective date", body.effective_date)}
        ${row("Current carrier", body.current_carrier)}
        ${row("Expiration", body.current_expiration)}
        ${row("Expiring premium", typeof body.expiring_premium === "number" ? `$${body.expiring_premium.toLocaleString("en-US")}` : undefined)}
        ${row("Markets consent", typeof body.consent_to_share_with_markets === "boolean" ? (body.consent_to_share_with_markets ? "Yes" : "No (hold for review)") : undefined)}
        ${row("Inquiry trigger", body.inquiry_trigger)}
      </table>
      ${portfolioBlock}
      <h3 style="font-family:Georgia,serif; font-weight:400; font-size:16px; margin-top:24px;">Contact</h3>
      <table style="border-collapse:collapse; width:100%; border-top:1px solid #0B0B0C; border-bottom:1px solid #0B0B0C;">
        ${row("Name", body.contact?.name)}
        ${row("Email", body.contact?.email)}
        ${row("Phone", body.contact?.phone)}
        ${row("Role", body.contact?.role ? CONTACT_ROLE_LABELS[body.contact.role] : undefined)}
        ${row("Preferred", body.contact?.preferred_method)}
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
