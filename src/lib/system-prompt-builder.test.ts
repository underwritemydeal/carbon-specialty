import { describe, expect, it } from "vitest";
import { buildSystemPrompt, RATE_BAND_HEADING } from "./system-prompt-builder";
import { carbonSpecialtyConfig } from "./tenants/carbon-specialty";

/**
 * Tests for the C.S.1.6.5 tenant-config-driven system-prompt builder.
 * `buildSystemPrompt` is a pure function — every assertion below is a
 * straight string-containment check against its output for the Carbon
 * Specialty (Tenant 1) config. No network, no Playwright.
 */

describe("buildSystemPrompt — Carbon Specialty config", () => {
  const prompt = buildSystemPrompt(carbonSpecialtyConfig);

  it("includes every intake field label", () => {
    for (const field of carbonSpecialtyConfig.intake.fields) {
      expect(prompt).toContain(field.label);
    }
  });

  it("includes every hard handoff trigger id", () => {
    for (const trigger of carbonSpecialtyConfig.intake.hardHandoffTriggers) {
      expect(prompt).toContain(trigger.id);
    }
  });

  it("includes the wrap-up sentinel string", () => {
    expect(prompt).toContain(carbonSpecialtyConfig.agent.wrapUpSentinel);
  });

  it("does NOT include the rate-band section when rateBandYaml is empty", () => {
    // Carbon's config ships rateBandYaml as "" until C.S.1.7 data lands.
    expect(carbonSpecialtyConfig.rateBandYaml ?? "").toBe("");
    expect(prompt).not.toContain(RATE_BAND_HEADING);
  });

  it("DOES include the rate-band section when rateBandYaml is populated", () => {
    const withBands = buildSystemPrompt({
      ...carbonSpecialtyConfig,
      rateBandYaml: "RATEBAND_TEST_TOKEN:\n  multifamily-ca: 0.45-0.95",
    });
    expect(withBands).toContain(RATE_BAND_HEADING);
    expect(withBands).toContain("RATEBAND_TEST_TOKEN");
  });
});
