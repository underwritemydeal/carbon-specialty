import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono, Bodoni_Moda } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ChatProvider } from "@/components/ChatProvider";
import { CookieBanner } from "@/components/CookieBanner";
import "@/styles/tokens.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-plex-serif",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bodoni",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carbonspecialty.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Carbon Specialty — Real estate and apartment building insurance",
    template: "%s — Carbon Specialty",
  },
  description:
    "Carbon Specialty is an independent insurance brokerage specializing in real estate insurance for investment property owners — multifamily, mixed-use, SFR portfolios, HOAs, and builders risk — nationwide.",
  applicationName: "Carbon Specialty",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Carbon Specialty",
    url: SITE_URL,
    title: "Carbon Specialty — Real estate insurance for investment property owners",
    description:
      "Independent brokerage specializing in real estate insurance for investment property owners — nationwide.",
    images: [{ url: "/api/og?title=Carbon%20Specialty", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Carbon Specialty",
    description: "Real estate and apartment building insurance.",
    images: ["/api/og?title=Carbon%20Specialty"],
  },
  // Pre-launch lockdown — see /AGENTS.md "Deploy safety" + sprint C.S.1.1.
  // Flip back to { index: true, follow: true } when content is broker- and
  // legal-reviewed and ready for launch.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#F5F2EC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} ${bodoni.variable}`}
    >
      <body>
        <PostHogProvider>
          <ChatProvider>
            <a href="#main" className="skip-link" style={{ position: "absolute", left: -9999, top: 0 }}>
              Skip to content
            </a>
            {children}
            <CookieBanner />
          </ChatProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
