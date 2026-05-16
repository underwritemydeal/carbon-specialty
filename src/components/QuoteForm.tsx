"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { submitLead } from "@/lib/covr";
import { track } from "@/lib/analytics";

type Step = 0 | 1 | 2;

type FormData = {
  assetClass: string;
  address: string;
  units: string;
  valuation: string;
  yearBuilt: string;
  entity: string;
  contact: string;
  email: string;
  phone: string;
  coverages: string[];
};

const STEPS = ["The asset", "The owner", "Coverage"] as const;

export function QuoteForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<FormData>({
    assetClass: "Multifamily",
    address: "",
    units: "",
    valuation: "",
    yearBuilt: "",
    entity: "",
    contact: "",
    email: "",
    phone: "",
    coverages: ["property", "gl"],
  });

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));
  const toggleCov = (c: string) =>
    setData((d) => ({
      ...d,
      coverages: d.coverages.includes(c) ? d.coverages.filter((x) => x !== c) : [...d.coverages, c],
    }));

  const advance = () => {
    track("cs_form_step_submitted", { step });
    setStep((s) => Math.min(2, s + 1) as Step);
  };

  const submit = async () => {
    setSubmitting(true);
    track("cs_form_completed");
    const r = await submitLead({ source: "form", payload: data });
    if (r.ok) track("cs_lead_captured", { route: r.route, source: "form" });
    router.push("/quote/sent");
  };

  return (
    <section
      style={{ padding: "64px var(--gutter) 96px", borderBottom: "1px solid var(--ink)" }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div
          className="qf-stepper"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 0,
            borderTop: "1px solid var(--ink)",
            marginBottom: 56,
          }}
        >
          {STEPS.map((s, i) => {
            const active = step === i;
            const done = step > i;
            return (
              <button
                key={s}
                type="button"
                onClick={() => i <= step && setStep(i as Step)}
                style={{
                  appearance: "none",
                  background: "transparent",
                  border: 0,
                  borderRight: i < 2 ? "1px solid var(--ink)" : "none",
                  borderTop: active
                    ? "2px solid var(--ember)"
                    : done
                      ? "2px solid var(--ink)"
                      : "2px solid transparent",
                  marginTop: -1,
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  alignItems: "flex-start",
                  cursor: i <= step ? "pointer" : "default",
                  fontFamily: "var(--font-body)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: active ? "var(--ember)" : "var(--ink-3)",
                  }}
                >
                  Step {String(i + 1).padStart(2, "0")} / 03 {done && "· ✓"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    color: "var(--ink)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 48 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ember)",
            }}
          >
            Quote · {STEPS[step]}
          </span>
          <h1
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "clamp(40px, 6vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              maxWidth: 700,
            }}
          >
            {step === 0 && (
              <>
                Tell us what we&apos;re <em style={{ fontStyle: "italic" }}>insuring</em>.
              </>
            )}
            {step === 1 && (
              <>
                And who <em style={{ fontStyle: "italic" }}>owns</em> it.
              </>
            )}
            {step === 2 && (
              <>
                Which coverages should we <em style={{ fontStyle: "italic" }}>bind</em>?
              </>
            )}
          </h1>
        </div>

        {step === 0 && (
          <div className="qf-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            <Select
              label="Asset class"
              value={data.assetClass}
              onChange={(v) => update("assetClass", v)}
              options={[
                "Multifamily",
                "Mixed-use",
                "SFR portfolio",
                "Condo HOA",
                "Small commercial",
                "Builders risk",
              ]}
            />
            <Field
              label="Year built"
              value={data.yearBuilt}
              onChange={(v) => update("yearBuilt", v)}
              placeholder="1962"
            />
            <Field
              label="Property address"
              value={data.address}
              onChange={(v) => update("address", v)}
              placeholder="1247 Pine Ave, Long Beach 90802"
              full
            />
            <Field
              label="Units"
              value={data.units}
              onChange={(v) => update("units", v)}
              placeholder="24"
            />
            <Field
              label="Replacement cost"
              value={data.valuation}
              onChange={(v) => update("valuation", v)}
              placeholder="$4,250,000"
            />
          </div>
        )}

        {step === 1 && (
          <div className="qf-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            <Field
              label="Owner entity"
              value={data.entity}
              onChange={(v) => update("entity", v)}
              placeholder="Pine Ave Holdings, LLC"
              full
            />
            <Field
              label="Contact name"
              value={data.contact}
              onChange={(v) => update("contact", v)}
              placeholder="A. Reyes"
            />
            <Field
              label="Email"
              value={data.email}
              onChange={(v) => update("email", v)}
              placeholder="reyes@pineave.co"
              type="email"
            />
            <Field
              label="Phone"
              value={data.phone}
              onChange={(v) => update("phone", v)}
              placeholder="(area) ___-____"
              type="tel"
            />
          </div>
        )}

        {step === 2 && (
          <fieldset
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              borderTop: "1px solid var(--ink)",
              border: 0,
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "var(--ink)",
              padding: 0,
              margin: 0,
            }}
          >
            <legend className="sr-only" style={{ position: "absolute", left: -9999 }}>
              Coverages
            </legend>
            {(
              [
                ["property", "Property — all-risk", "Replacement cost · ordinance & law"],
                ["gl", "General liability", "$1M / $2M baseline"],
                ["umbrella", "Umbrella", "$5M – $25M excess"],
                ["epli", "Employment practices liability", "Habitational EPLI"],
                ["eq", "Earthquake — DIC", "Surplus-lines · separate limit"],
                ["flood", "Flood — NFIP + private", "Per FEMA zone"],
              ] as const
            ).map(([id, name, body]) => {
              const on = data.coverages.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCov(id)}
                  className="qf-cov"
                  style={{
                    appearance: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    background: on ? "var(--ink)" : "var(--paper)",
                    color: on ? "var(--paper)" : "var(--ink)",
                    border: 0,
                    borderBottom: "1px solid var(--ink)",
                    padding: "24px 0",
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 2fr 80px",
                    alignItems: "center",
                    gap: 24,
                    transition: "background var(--dur-fast) var(--ease)",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      border: `1px solid ${on ? "var(--paper)" : "var(--ink)"}`,
                      background: on ? "var(--ember)" : "transparent",
                      marginLeft: 8,
                      display: "inline-grid",
                      placeItems: "center",
                    }}
                    aria-hidden
                  >
                    {on && <Icon name="check" size={12} stroke={2} />}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      color: on ? "var(--paper-2)" : "var(--ink-2)",
                    }}
                  >
                    {body}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: on ? "var(--paper-3)" : "var(--ink-3)",
                      textAlign: "right",
                      paddingRight: 8,
                    }}
                  >
                    {on ? "Included" : "Add"}
                  </span>
                </button>
              );
            })}
          </fieldset>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 48,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
            disabled={step === 0}
            style={step === 0 ? { opacity: 0.3, cursor: "not-allowed" } : {}}
          >
            ← Back
          </button>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            A specialist follows up on every complete submission
          </span>
          {step < 2 ? (
            <button className="btn" type="button" onClick={advance}>
              Continue <Icon name="arrow-right" size={14} />
            </button>
          ) : (
            <button className="btn" type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for quote"} <Icon name="arrow-right" size={14} />
            </button>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 700px) {
          .qf-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .qf-stepper { grid-template-columns: 1fr !important; }
          .qf-stepper button { border-right: none !important; border-bottom: 1px solid var(--ink); }
          .qf-cov { grid-template-columns: 24px 1fr !important; gap: 12px !important; }
          .qf-cov > span:nth-child(3), .qf-cov > span:nth-child(4) { grid-column: 1 / -1; }
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  full,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
  type?: string;
}) {
  const id = `qf-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        gridColumn: full ? "1 / -1" : "auto",
      }}
    >
      <label
        htmlFor={id}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 17,
          color: "var(--ink)",
          background: "transparent",
          border: 0,
          borderBottom: "1px solid var(--ink)",
          padding: "10px 0",
          outline: "none",
          borderRadius: 0,
        }}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const id = `qf-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 17,
          color: "var(--ink)",
          background: "transparent",
          border: 0,
          borderBottom: "1px solid var(--ink)",
          padding: "10px 0",
          outline: "none",
          borderRadius: 0,
          appearance: "none",
        }}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
