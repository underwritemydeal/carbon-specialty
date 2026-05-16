/**
 * Mirror of Covr's intake-extractor.js — converted to TypeScript.
 * Used by CarbonChat to extract a structured payload from the conversation
 * once intake appears complete, so the /leads/inbound POST has more than
 * just a transcript.
 */

export type IntakePayload = {
  assetClass?: string;
  city?: string;
  zip?: string;
  state?: string;
  unitCount?: number;
  yearBuilt?: number;
  replacementCost?: number;
  currentCarrier?: string;
  renewalDate?: string;
  ownerEntity?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  rawNotes: string;
};

export type Message = { role: "user" | "assistant"; content: string };

const ASSET_CLASS_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "Multifamily", re: /\b(multi[-\s]?family|apartment|apt\.?|units?|walk[-\s]?up|garden|low[-\s]?rise|mid[-\s]?rise)\b/i },
  { label: "Mixed-use", re: /\b(mixed[-\s]?use|retail\s*\+?\s*resi|ground[-\s]?floor)\b/i },
  { label: "SFR portfolio", re: /\b(sfr|single[-\s]?family\s*rentals?|scattered[-\s]?site|doors?\b)/i },
  { label: "Condo HOA", re: /\b(hoa|condo\s*assoc|condominium|home\s*owners?)\b/i },
  { label: "Small commercial", re: /\b(strip\s*retail|office|light\s*industrial|owner[-\s]?occupied)\b/i },
  { label: "Builders risk", re: /\b(builders?\s*risk|ground[-\s]?up|adaptive\s*reuse|construction)\b/i },
];

const STATE_FROM_CITY: Record<string, string> = {
  "long beach": "CA",
  oakland: "CA",
  "los angeles": "CA",
  "san francisco": "CA",
  sacramento: "CA",
  "san diego": "CA",
  fresno: "CA",
  phoenix: "AZ",
  tucson: "AZ",
  denver: "CO",
  boise: "ID",
  "las vegas": "NV",
  reno: "NV",
  portland: "OR",
  eugene: "OR",
  austin: "TX",
  houston: "TX",
  dallas: "TX",
  "salt lake": "UT",
  seattle: "WA",
  spokane: "WA",
};

const NUM = "([0-9][0-9,]*(?:\\.[0-9]+)?)";

export function extractIntake(messages: Message[]): IntakePayload {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const out: IntakePayload = { rawNotes: userText };

  for (const { label, re } of ASSET_CLASS_PATTERNS) {
    if (re.test(userText)) {
      out.assetClass = label;
      break;
    }
  }

  // Units
  const units = userText.match(new RegExp(`${NUM}\\s*(?:unit|door|apt|apartment)s?\\b`, "i"));
  if (units) out.unitCount = parseInt(units[1].replace(/,/g, ""), 10);

  // Year built — 4-digit year between 1850 and current
  const year = userText.match(/\b(18[5-9][0-9]|19[0-9]{2}|20[0-2][0-9])\b/);
  if (year) out.yearBuilt = parseInt(year[1], 10);

  // Replacement cost — $ followed by number, optionally K/M/B
  const cost = userText.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*([kKmMbB])?/);
  if (cost) {
    let n = parseFloat(cost[1].replace(/,/g, ""));
    const suffix = (cost[2] || "").toLowerCase();
    if (suffix === "k") n *= 1_000;
    if (suffix === "m") n *= 1_000_000;
    if (suffix === "b") n *= 1_000_000_000;
    out.replacementCost = Math.round(n);
  }

  // Zip
  const zip = userText.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zip) out.zip = zip[1];

  // City — match against the known dictionary
  const lower = userText.toLowerCase();
  for (const city of Object.keys(STATE_FROM_CITY)) {
    if (lower.includes(city)) {
      out.city = city.replace(/\b\w/g, (c) => c.toUpperCase());
      out.state = STATE_FROM_CITY[city];
      break;
    }
  }

  // Email
  const email = userText.match(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i);
  if (email) out.contactEmail = email[1];

  // Phone — US-ish formats
  const phone = userText.match(
    /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
  );
  if (phone) out.contactPhone = `+1 (${phone[1]}) ${phone[2]}-${phone[3]}`;

  // Carrier name — looks for "with <Word>" pattern
  const carrier = userText.match(
    /\b(?:with|on|through|via|carrier(?: is)?)\s+(Travelers|Liberty\s*Mutual|AmTrust|Markel|Berkley|Chubb|Hartford|Zurich|CNA|Nationwide|ICW|Philadelphia|Allianz|AIG|Tokio\s*Marine)/i,
  );
  if (carrier) out.currentCarrier = carrier[1];

  return out;
}

export function looksComplete(payload: IntakePayload): boolean {
  // Conservative — at least asset class + city + (units or year built) + email or phone
  return Boolean(
    payload.assetClass &&
      payload.city &&
      (payload.unitCount || payload.yearBuilt) &&
      (payload.contactEmail || payload.contactPhone),
  );
}
