export type Author = {
  slug: "robby-hess" | "anthony-miller";
  name: string;
  role: string;
  yearsExperience: number;
  bio: string;
  expertise: string[];
};

export const AUTHORS: Record<Author["slug"], Author> = {
  "robby-hess": {
    slug: "robby-hess",
    name: "Robby Hess",
    role: "Co-founder & Senior Client Manager",
    yearsExperience: 20,
    bio: "Robby Hess has 20+ years in commercial insurance, most recently as Senior Client Manager at a top-50 national brokerage. He specializes in California multifamily, mixed-use, and apartment-building schedules — placing all-risk property, GL, umbrella, EPLI, and earthquake DIC across the Western United States. He writes from the underwriter's desk forward.",
    expertise: [
      "Multifamily property insurance",
      "Apartment building schedules",
      "California real estate insurance",
      "Earthquake DIC placement",
      "Habitational umbrella programs",
    ],
  },
  "anthony-miller": {
    slug: "anthony-miller",
    name: "Anthony Miller",
    role: "Co-founder & Head of Business Development",
    yearsExperience: 30,
    bio: "Anthony Miller has 30 years in the insurance industry, founder of Golden State Insurance Solutions, and leads Carbon's carrier partnerships and business development. His relationships across the admitted and surplus-lines markets are what give Carbon access to A-rated real estate insurance markets across Arizona, California, Colorado, Idaho, Nevada, Oregon, Texas, Utah, and Washington.",
    expertise: [
      "Real estate insurance distribution",
      "Carrier partnerships",
      "Surplus-lines placement",
      "Mixed-use commercial real estate",
      "Western United States insurance markets",
    ],
  },
};

export function AuthorBio({ author }: { author: Author }) {
  return (
    <article
      itemScope
      itemType="https://schema.org/Person"
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 32,
        padding: "32px 0",
        borderTop: "1px solid var(--ink)",
      }}
      className="author-bio"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ember)",
          }}
        >
          {author.yearsExperience}+ years
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          Co-founder
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3
          itemProp="name"
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          {author.name}
        </h3>
        <span
          itemProp="jobTitle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          {author.role}
        </span>
        <p
          itemProp="description"
          style={{
            margin: 0,
            fontFamily: "var(--font-body)",
            fontSize: 16,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            maxWidth: 720,
          }}
        >
          {author.bio}
        </p>
        <ul
          style={{
            margin: "8px 0 0",
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {author.expertise.map((e) => (
            <li
              key={e}
              itemProp="knowsAbout"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "4px 10px",
                border: "1px solid var(--ink)",
                color: "var(--ink)",
              }}
            >
              {e}
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        @media (max-width: 700px) {
          .author-bio { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </article>
  );
}
