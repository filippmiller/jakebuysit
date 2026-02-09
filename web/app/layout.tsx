import type { Metadata } from "next";
import { Syne, Outfit } from "next/font/google";
import nextDynamic from "next/dynamic";
import "./globals.css";

// Force dynamic rendering for all pages — browser-only deps (Rive, Howler) break during SSG
export const dynamic = 'force-dynamic';

const Navigation = nextDynamic(() => import("@/components/Navigation").then(m => m.Navigation), { ssr: false });

const syne = Syne({ subsets: ["latin"], variable: '--font-display' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Jake Buys It - Instant Cash Offers",
  description: "Show Jake what you got. Get instant cash offers from Jake's AI pawn shop. Snap a photo, get a fair price powered by real market data.",
  keywords: ["pawn", "sell", "instant offer", "cash", "buy", "second hand", "electronics", "trade in"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://jakebuysit.com"),
  openGraph: {
    title: "Jake Buys It - Instant Cash Offers",
    description: "Snap a photo, get a fair price. Jake uses real market data to make instant offers.",
    siteName: "Jake Buys It",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jake Buys It - Instant Cash Offers",
    description: "Snap a photo, get a fair price. Jake uses real market data to make instant offers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${outfit.variable} font-sans antialiased`}>
        <Navigation />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
