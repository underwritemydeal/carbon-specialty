/**
 * Tenant registry — sprint C.S.1.6.5.
 *
 * The single lookup point for tenant configs. Adding a new brokerage
 * is a two-step, no-code-deploy operation:
 *   1. Add its config file and register it in `ALL_TENANTS` below.
 *   2. Add its id to the `ACTIVE_TENANTS` env var (comma-separated).
 *
 * `getTenantConfig` enforces three gates — the tenant must exist in
 * `ALL_TENANTS`, be listed in `ACTIVE_TENANTS`, and have `active: true`
 * in its own config. Any miss returns null.
 */

import type { TenantIntakeConfig } from "./index";
import { carbonSpecialtyConfig } from "./carbon-specialty";

/** Every tenant config the codebase knows about, active or not.
 *  Registering here is step 1 of onboarding a tenant. */
const ALL_TENANTS: Record<string, TenantIntakeConfig> = {
  "carbon-specialty": carbonSpecialtyConfig,
};

const DEFAULT_TENANT_ID = "carbon-specialty";

/** Parses the ACTIVE_TENANTS env var into a trimmed id list.
 *  Defaults to ["carbon-specialty"] when unset or empty. */
export function getActiveTenantIds(): string[] {
  const raw = process.env.ACTIVE_TENANTS;
  if (!raw || !raw.trim()) return [DEFAULT_TENANT_ID];
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : [DEFAULT_TENANT_ID];
}

/**
 * Resolves a tenant config for use by the chat route.
 *
 * Returns null when the tenant id is unknown, is not listed in the
 * `ACTIVE_TENANTS` env var, or the config's own `active` flag is false.
 */
export function getTenantConfig(tenantId: string): TenantIntakeConfig | null {
  const config = ALL_TENANTS[tenantId];
  if (!config) return null;
  if (!getActiveTenantIds().includes(tenantId)) return null;
  if (config.active === false) return null;
  return config;
}

/** The tenant used when a request omits `tenantId`. */
export function getDefaultTenantId(): string {
  return DEFAULT_TENANT_ID;
}

/** Whether a tenant config is registered in the codebase at all —
 *  independent of the ACTIVE_TENANTS env gate. Used by the admin
 *  tenant-toggle endpoint to report `configExists`. */
export function tenantConfigExists(tenantId: string): boolean {
  return Boolean(ALL_TENANTS[tenantId]);
}

/** The raw config bypassing the ACTIVE_TENANTS env gate. Used by the
 *  admin tenant-toggle endpoint to report `configActive`. */
export function getRawTenantConfig(tenantId: string): TenantIntakeConfig | null {
  return ALL_TENANTS[tenantId] ?? null;
}
