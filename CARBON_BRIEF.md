# Carbon Specialty — Master Brief

**Last updated: 2026-05-18 (Sprint C.S.1.6.5 — nationwide pivot + home Coverage / `/coverage` kill)**

## What it is

Carbon Specialty is an AI-native real estate insurance brokerage specializing in real estate insurance for **investment property owners** — multifamily, mixed-use, SFR portfolios, HOAs, and apartment buildings. The placement scope runs from five units to billion-dollar schedules, across admitted markets, surplus lines, and specialty programs.

The thesis is editorial in tone and operational in execution: real estate insurance has been transacted through faxes, PDF supplements, and bilateral phone calls for thirty years, and the buyer side (owners, GPs, asset managers) is increasingly impatient with that experience. Carbon's wedge is an AI-led intake that produces a quoteable submission packet in minutes instead of days, paired with specialist humans behind it doing the actual placement work.

## Geographic scope

**Nationwide.** Carbon places real estate insurance for investment property owners in every region of the country, using direct admitted appointments where available and wholesale or program partners where the right market lives elsewhere. The marketing-positioning constraint of "Phase 1: Western US" was retired in C.S.1.6.5 — the operator's framing is that Carbon's job is to know which carrier or program delivers the broadest coverage and the most competitive rates in any region.

**Licensure** (separate from placement footprint, intentionally narrower for legal accuracy): Carbon Specialty Insurance Services is California-domiciled with multi-state direct-appointment extensions. The literal licensed-state enumeration lives in `/terms` as a statement of fact and is the authoritative legal scope. Marketing surfaces (`/`, `/about`, `/what-we-write`, `/insights`, footer, metadata, OG, llms.txt) read "nationwide" via wholesale and program partners.

## Operating structure

- **AMS**: NowCerts (chosen for API access and modern data model — alternatives EZLynx and Applied Epic were rejected for closed-system constraints).
- **Cluster**: PIIB for direct carrier appointments in Carbon's directly-licensed states. Direct appointments give Carbon access to admitted markets, contingent commissions, and direct loss-ratio data.
- **Wholesale**: Distinguished + Honeycomb for surplus lines and specialty programs — the path to nationwide placement outside the direct-appointment footprint.
- **Carrier mix posture**: Open architecture. Carbon places business where the risk fits best, not where commission is highest. This is a stated value proposition to buyers.

## Founding team

Three co-founders. Robby Hess is the technical co-founder building the platform and AI intake stack. The other two are friends and former coworkers from Trucordia — both bring producer-side experience in commercial lines and existing buyer relationships in California multifamily. Roles will formalize as Carbon approaches launch.

**Critical**: Anthony Miller (Robby's co-founder on Covr AI) is NOT involved in Carbon Specialty. Do not reference Anthony in any Carbon-context conversation. Carbon and Covr are separate ventures with separate cap tables.

## Target customer profile

- **Primary**: Investment property owners and asset managers operating 5-500 unit multifamily portfolios, nationwide. Sweet spot: $50M-$500M total insured value.
- **Secondary**: HOAs, mixed-use buildings, SFR portfolio operators, small-to-mid apartment syndicators.
- **Buyer persona**: Typically the GP, asset manager, or in-house insurance lead at a sponsor or operator. Sophisticated enough to compare quotes intelligently. Frustrated by the 2-4 week submission-to-quote turnaround at traditional brokerages. Open to AI-led intake if it materially reduces their hours invested.

## Differentiation vs incumbents

- **vs Lockton / Marsh / WTW**: Carbon is small enough to actually pay attention to mid-market accounts that Lockton's enterprise teams treat as small. The bar is "specialist who returns your call same day."
- **vs Steadily / Obie / Lemonade**: Those are carriers + direct-write platforms. Carbon is a brokerage — placing across many carriers, not selling one carrier's product. Different value to buyers who want shopping rather than one-bid quotes.
- **vs traditional regional brokers**: Carbon's AI intake compresses the submission packet build from days to minutes. Same placement expertise, faster cycle.
- **vs InsurTech MGAs**: Carbon is not an MGA — no binding authority, no underwriting risk on the balance sheet. Pure brokerage economics.

## Regulatory posture

Carbon is a licensed brokerage entity, not a tech platform. The AI intake helps with FACT CAPTURE, not coverage determination or pricing. Hard handoff to a licensed human specialist before any indication is bound. This is encoded in the chat system prompt with explicit triggers — see CARBON_TECH.md for the trigger list. NAIC Model Bulletin on AI in insurance (adopted in 26+ states as of Q1 2026) is the compliance frame: Carbon's bot intakes facts and routes; it never makes coverage determinations.

## Brand positioning summary

The brand line: **"Insuring the buildings that make our cities home."** Editorial, restrained, architectural. Not InsurTech-disruption energy. Not big-box-broker energy. Something closer to a well-designed magazine or a thoughtful urbanism firm — calm, confident, specific.

Design system reference: CARBON_DESIGN.md.

## What Carbon is NOT

- Not a carrier. Carbon does not take risk.
- Not an MGA. Carbon does not have binding authority.
- Not a chat-only experience. The AI intake is the front door; specialists do the actual brokerage work.
- Not bound to one AMS or one cluster. The current stack is a deliberate choice but not a religion.
- Not affiliated with Trucordia, Golden State, Covr AI, or any other Robby venture. Separate cap table, separate brand, separate compliance scope.

## Site structure (post-C.S.1.6.5)

The home page reads: hero → operator-approved three-line body lede with pine-italic pull-quote → mobile-dominant CarbonChat affordance → Position → AssetClasses → CarrierBar → Process → FAQ → Footer. The standalone Coverage section (three umbrella chapters with "All coverages →" link) was killed; the standalone `/coverage` route (twelve editorial chapters) was also killed. Carbon's coverage menu now lives implicitly in CarbonChat conversation and in `/what-we-write` asset-class detail — not as a marketing index page. The hamburger nav drops the `Coverage` slot accordingly.
