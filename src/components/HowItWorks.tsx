/**
 * HowItWorks — sprint C.S.2.0.
 *
 * "A better way to get insured" section. Four-column row of icon +
 * label + body, separated by hairline paper-at-10% vertical dividers.
 * Sits on a near-ink (#0D1214) background to differentiate from the
 * hero's pure ink without breaking the dark surface continuity.
 *
 * Icons are simple inline SVGs in pine — chat bubble, document,
 * building, person — sized 24px. No SVG icon library, no external
 * font icons; the four glyphs are small and stable.
 */

const STEPS = [
  {
    key: "smart-intake",
    label: "Smart intake",
    body: "Answer a few questions about your property or portfolio. We'll capture what underwriters need.",
    icon: ChatIcon,
  },
  {
    key: "expert-review",
    label: "Expert review",
    body: "Your submission is reviewed by specialists and matched to the right markets.",
    icon: DocIcon,
  },
  {
    key: "market-options",
    label: "Market options",
    body: "Receive real coverage options from top-rated carriers — fast.",
    icon: BuildingIcon,
  },
  {
    key: "ongoing-support",
    label: "Ongoing support",
    body: "We're here year-round to help manage your policy and your portfolio.",
    icon: PersonIcon,
  },
];

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-headline"
      className="cs-how"
    >
      <div className="container">
        <div className="cs-how__intro">
          <span className="cs-how__eyebrow">A better way to get insured</span>
          <div className="cs-how__intro-grid">
            <h2 id="how-it-works-headline" className="cs-how__headline">
              Built around how you actually work.
            </h2>
            <p className="cs-how__body">
              We combine deep real estate expertise with a modern intake
              process to save you time and deliver better results.
            </p>
          </div>
        </div>

        <ul className="cs-how__steps">
          {STEPS.map(({ key, label, body, icon: Icon }) => (
            <li key={key} className="cs-how__step">
              <span className="cs-how__step-icon" aria-hidden>
                <Icon />
              </span>
              <span className="cs-how__step-label">{label}</span>
              <p className="cs-how__step-body">{body}</p>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .cs-how {
          background: #0D1214;
          color: var(--paper);
          padding: 80px 0;
        }
        .cs-how__intro {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 64px;
        }
        .cs-how__eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ember);
        }
        .cs-how__intro-grid {
          display: grid;
          grid-template-columns: minmax(0, 480px) 1fr;
          align-items: end;
          gap: 64px;
        }
        .cs-how__headline {
          margin: 0;
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 40px;
          line-height: 1.1;
          color: var(--paper);
          text-wrap: balance;
        }
        .cs-how__body {
          margin: 0;
          font-family: var(--font-body);
          font-size: 17px;
          line-height: 1.6;
          color: rgba(244,241,234,0.70);
          max-width: 56ch;
          text-wrap: pretty;
        }

        .cs-how__steps {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 40px;
        }
        .cs-how__step {
          position: relative;
          padding-left: 40px;
        }
        .cs-how__step + .cs-how__step::before {
          content: "";
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 1px;
          background: rgba(244,241,234,0.10);
        }
        .cs-how__step:first-child { padding-left: 0; }
        .cs-how__step-icon {
          display: inline-flex;
          color: var(--ember);
          margin-bottom: 20px;
        }
        .cs-how__step-label {
          display: block;
          font-family: var(--font-body);
          font-weight: 500;
          font-size: 15px;
          color: var(--paper);
          line-height: 1.2;
        }
        .cs-how__step-body {
          margin: 12px 0 0;
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.55;
          color: rgba(244,241,234,0.60);
          text-wrap: pretty;
        }

        @media (max-width: 1024px) {
          .cs-how__intro-grid { grid-template-columns: 1fr; gap: 24px; }
          .cs-how__steps {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .cs-how__step + .cs-how__step::before { display: none; }
          .cs-how__step { padding-left: 0; }
        }
        @media (max-width: 600px) {
          .cs-how { padding: 56px 0; }
          .cs-how__steps { grid-template-columns: 1fr; gap: 32px; }
          .cs-how__headline { font-size: 32px; }
        }
      `}</style>
    </section>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
