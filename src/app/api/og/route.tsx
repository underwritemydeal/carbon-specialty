import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "Carbon Specialty";
  const sub = searchParams.get("sub") ?? "Real estate insurance · California-led · Western United States";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "80px",
          background: "#F5F2EC",
          color: "#0B0B0C",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "monospace",
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6E6E72",
          }}
        >
          <span>Carbon</span>
          <span style={{ flex: 1, height: 1, background: "#0B0B0C" }} />
          <span>Specialty · Insurance</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h1
            style={{
              fontSize: 88,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              margin: 0,
              maxWidth: 1000,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              marginTop: 32,
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: "0.06em",
              color: "#2A2A2D",
              maxWidth: 920,
            }}
          >
            {sub}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 24,
            borderTop: "1px solid #0B0B0C",
            fontFamily: "monospace",
            fontSize: 16,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6E6E72",
          }}
        >
          <span>carbonspecialty.com</span>
          <span style={{ color: "#1F4D38" }}>Real estate insurance · Western United States</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
