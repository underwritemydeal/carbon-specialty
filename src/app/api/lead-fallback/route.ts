import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });

  const to = process.env.FALLBACK_EMAIL_TO;
  const apiKey = process.env.RESEND_API_KEY;

  if (!to || !apiKey) {
    console.warn("Lead fallback received but Resend is not configured:", JSON.stringify(body).slice(0, 2000));
    return NextResponse.json({ ok: true, route: "logged-only" });
  }

  const resend = new Resend(apiKey);
  const subject =
    body.source === "chat"
      ? `[Carbon] Chat intake — ${body.payload?.assetClass ?? "unknown asset"} ${body.payload?.city ?? ""}`.trim()
      : `[Carbon] Form submission — ${body.payload?.assetClass ?? "unknown asset"}`;

  const lines: string[] = [];
  lines.push(`Source: ${body.source}`);
  lines.push("");
  lines.push("--- Payload ---");
  for (const [k, v] of Object.entries(body.payload ?? {})) {
    if (v == null || v === "") continue;
    lines.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
  if (Array.isArray(body.transcript) && body.transcript.length) {
    lines.push("");
    lines.push("--- Transcript ---");
    for (const msg of body.transcript) {
      lines.push(`[${msg.role}] ${msg.content}`);
      lines.push("");
    }
  }

  try {
    await resend.emails.send({
      from: "Carbon Specialty <noreply@carbonspecialty.com>",
      to,
      subject,
      text: lines.join("\n"),
    });
    return NextResponse.json({ ok: true, route: "fallback-email" });
  } catch (err) {
    console.error("Resend failure:", err);
    return NextResponse.json({ ok: false, error: "send-failed" }, { status: 502 });
  }
}
