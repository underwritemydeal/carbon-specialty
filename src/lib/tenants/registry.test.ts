import { afterEach, describe, expect, it, vi } from "vitest";
import { getTenantConfig } from "./registry";

/**
 * Tests for the C.S.1.6.5 tenant registry. `getTenantConfig` gates on
 * three conditions — the tenant must be registered, listed in the
 * ACTIVE_TENANTS env var, and `active: true` in its own config. These
 * tests drive the ACTIVE_TENANTS gate via env stubbing.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getTenantConfig", () => {
  it("returns the config when the tenant is listed in ACTIVE_TENANTS", () => {
    vi.stubEnv("ACTIVE_TENANTS", "carbon-specialty");
    const config = getTenantConfig("carbon-specialty");
    expect(config).not.toBeNull();
    expect(config?.id).toBe("carbon-specialty");
  });

  it("returns null for an unknown tenant id", () => {
    vi.stubEnv("ACTIVE_TENANTS", "carbon-specialty,unknown-tenant");
    expect(getTenantConfig("unknown-tenant")).toBeNull();
  });

  it("returns null when the tenant is not in ACTIVE_TENANTS", () => {
    vi.stubEnv("ACTIVE_TENANTS", "other-tenant");
    expect(getTenantConfig("carbon-specialty")).toBeNull();
  });
});
