import { NextResponse } from "next/server";
import {
  getActiveTenantIds,
  getRawTenantConfig,
  tenantConfigExists,
} from "@/lib/tenants/registry";

export const runtime = "nodejs";

/**
 * POST /api/admin/tenant-toggle — sprint C.S.1.6.5.
 *
 * Operator self-service endpoint for the multi-tenant intake system.
 *
 * Auth: `Authorization: Bearer <ADMIN_SECRET>`. Any mismatch (including
 * an unset ADMIN_SECRET env var) returns 401.
 *
 * Body: { tenantId: string, action: "enable" | "disable" | "status" }
 * (`action` may also be supplied as a `?action=` query param.)
 *
 * - "status"  — reports whether the tenant config exists, is listed in
 *   ACTIVE_TENANTS, and is marked active in its own config.
 * - "enable" / "disable" — Vercel does not let a running function
 *   mutate its own env vars, so this endpoint cannot persist the
 *   change. Instead it returns the exact ACTIVE_TENANTS edit the
 *   operator needs to make. The endpoint IS the documentation.
 */

interface ToggleBody {
  tenantId?: unknown;
  action?: unknown;
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: ToggleBody = {};
  try {
    body = (await req.json()) as ToggleBody;
  } catch {
    // Body is optional when action comes via query param; tolerate
    // an empty / unparseable body and fall through to validation.
  }

  const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
  const queryAction = new URL(req.url).searchParams.get("action");
  const action =
    typeof body.action === "string" && body.action
      ? body.action
      : queryAction ?? "";

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing `tenantId`" },
      { status: 400 },
    );
  }
  if (action !== "enable" && action !== "disable" && action !== "status") {
    return NextResponse.json(
      { ok: false, error: 'Invalid `action` — expected "enable", "disable", or "status"' },
      { status: 400 },
    );
  }

  if (action === "status") {
    const raw = getRawTenantConfig(tenantId);
    return NextResponse.json({
      ok: true,
      tenantId,
      configExists: tenantConfigExists(tenantId),
      activeInEnv: getActiveTenantIds().includes(tenantId),
      configActive: raw ? raw.active === true : false,
    });
  }

  // enable / disable — cannot mutate env at runtime; return the recipe.
  const current = getActiveTenantIds().join(",");
  const verb = action === "enable" ? "Add" : "Remove";
  return NextResponse.json({
    ok: true,
    tenantId,
    action,
    message: `To persist this change, update ACTIVE_TENANTS in Vercel environment variables. Current ACTIVE_TENANTS: ${current}`,
    instruction: `${verb} ${tenantId} ${action === "enable" ? "to" : "from"} the comma-separated list.`,
  });
}
