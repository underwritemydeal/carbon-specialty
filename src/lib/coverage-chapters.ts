/**
 * Coverage chapters — sprint C.S.1.6.3.
 *
 * Twelve editorial chapters that back the /coverage page. Chapter
 * headlines + bodies were operator-approved during the sprint brief
 * (see CARBON_ROADMAP.md → C.S.1.6.3). Marginalia is short-form
 * mono register, hidden under 768px viewports.
 *
 * Order is load-bearing — the chapter index renders zero-padded
 * ("01", "02", ...) so the pagination marker NN / 12 reads correctly.
 */

export interface CoverageChapter {
  index: string;
  label: string;
  headline: string;
  body: string;
  marginalia: string;
}

export const COVERAGE_CHAPTERS: ReadonlyArray<CoverageChapter> = [
  {
    index: "01",
    label: "Property",
    headline: "All-risk, replacement cost, agreed value, ordinance and law.",
    body:
      "Replacement cost, agreed value, ordinance and law — the three coverage forms that decide what a building is actually insured for when something goes wrong. Earthquake and flood placed through the surplus-lines market in the jurisdictions and the building types the standard carriers won't bind. Schedules read line by line; coinsurance, exclusions, and sublimits get translated into English before anything gets signed.",
    marginalia: "Replacement cost · agreed value · ordinance & law · EQ · flood",
  },
  {
    index: "02",
    label: "General Liability",
    headline: "Per-location $1M / $2M as the floor, exclusions as the work.",
    body:
      "Per-location $1M / $2M baseline scaled up for portfolios and larger schedules. Habitational exclusions — assault and battery, animal liability, lead, mold, abuse and molestation, deadly weapons — read line by line before placement. The exclusions matter as much as the limits; a $2M policy with an animal-liability carve-out is not the policy you thought you bought.",
    marginalia: "Per-location limits · habitational exclusions · primary GL",
  },
  {
    index: "03",
    label: "Umbrella & Excess",
    headline: "Five million to twenty-five, layered above the schedule.",
    body:
      "Five million to twenty-five million dollars layered above the underlying general liability, often across multiple buildings or entities on a single tower. Habitational umbrella markets are narrow, particularly in coastal and wildfire-exposed jurisdictions. Worth the structure work upfront — laddered attachment points and matching forms — so the claim that finally lands doesn't surface a gap nobody noticed.",
    marginalia: "$5M – $25M+ · habitational umbrella · laddered excess",
  },
  {
    index: "04",
    label: "Workers' Compensation",
    headline: "For the operating entity, not the property entity.",
    body:
      "Written for the operating entity that signs the paychecks, not the LLC that owns the building. Onsite staff, leasing agents, maintenance crews, and property-management employees all fall on this policy. Class codes, payroll audits, and the experience modification factor move premium more than the headline rate ever does — the audit is where the policy is actually priced.",
    marginalia: "Operating entity · class codes · experience mod",
  },
  {
    index: "05",
    label: "EPLI",
    headline: "Employment practices, plus third-party tenant claims.",
    body:
      "Employment practices liability for the operating entity — wrongful termination, discrimination, harassment, retaliation. Third-party tenant coverage layered on for habitational exposure, where tenants name the landlord in employment-adjacent claims that look nothing like a standard slip-and-fall. Carriers want a current employee handbook and an HR resource on record before they bind.",
    marginalia: "EPLI · third-party tenant · HR underwriting questions",
  },
  {
    index: "06",
    label: "Directors & Officers",
    headline: "For HOAs, GP entities, and syndicator boards.",
    body:
      "Directors and officers liability for HOA boards, general-partner entities, and syndicator boards — the policy that defends the decision, not the building. Written wherever there's a board to be sued or a fiduciary duty to be challenged. Habitational D&O carriers underwrite differently than corporate D&O carriers; the submission gets built for the audience that's reading it.",
    marginalia: "HOA boards · GP entities · syndicator D&O",
  },
  {
    index: "07",
    label: "Errors & Omissions",
    headline: "Professional liability for property managers and brokers.",
    body:
      "Property management E&O and real-estate professional liability — the policy that responds to a claim arising out of advice given, a fee charged, or a service performed. Distinct from the slip-and-fall claims general liability handles. The policy that defends a fee, not a building.",
    marginalia: "Property mgmt E&O · real estate professional liability",
  },
  {
    index: "08",
    label: "Cyber Liability",
    headline: "Tenant data, payment processing, building management systems.",
    body:
      "Cyber liability for the operating entity — tenant data, online rent payment, ACH and credit card processing, and the building-management systems sharing the same network. Ransomware, business interruption, and breach-notification obligations covered. The threat surface is no longer hypothetical; the placement isn't either.",
    marginalia: "Tenant PII · payment processing · BMS exposure",
  },
  {
    index: "09",
    label: "Crime & Fidelity Bonds",
    headline: "Employee dishonesty, fund-handling, treasurer bonds.",
    body:
      "Employee dishonesty, computer fraud, funds-transfer fraud — coverage for the money that moves through the operation. HOA treasurer bonds when lender covenants or state statute require them. Limit calibrated to the largest sum sitting in a single account at any moment, not the average balance, because the loss only happens once.",
    marginalia: "Employee dishonesty · HOA treasurer bond · funds transfer",
  },
  {
    index: "10",
    label: "Pollution Legal Liability",
    headline: "Habitational PLL — mold, lead, water, fuel storage.",
    body:
      "Habitational pollution legal liability — mold, lead paint, asbestos, indoor air quality, water intrusion, and on-site fuel storage. The exposure that the general liability policy explicitly excludes by endorsement. Placed when there's an older building, a basement, a tank on the schedule, or a habitational portfolio of any meaningful size.",
    marginalia: "Mold · lead · water intrusion · UST · habitational PLL",
  },
  {
    index: "11",
    label: "Hired & Non-Owned Auto",
    headline: "For the employee in the personal car on company time.",
    body:
      "Hired and non-owned auto for the operating entity — covers the employee who drives a personal car to a property on company business and the rental picked up for a site visit. Standalone or as an endorsement on the GL, depending on the carrier. Cheap to bind; expensive to be without when an employee is at-fault in a serious accident.",
    marginalia: "Employee personal vehicle · rental cars · HNOA endorsement",
  },
  {
    index: "12",
    label: "Equipment Breakdown",
    headline: "Chillers, boilers, elevators, switchgear.",
    body:
      "Equipment breakdown for the mechanical and electrical systems the property policy treats as off-limits. Chillers, boilers, elevators, switchgear, HVAC, transformers. Pays for both the equipment and the income lost while the building runs partially offline. Worth the line item on any building with a real systems schedule.",
    marginalia: "Chillers · boilers · elevators · switchgear · HVAC",
  },
];
