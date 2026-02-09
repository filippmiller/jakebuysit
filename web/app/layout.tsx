import type { Metadata } from "next";
import { Inter } from "next/font/google";
import nextDynamic from "next/dynamic";
import "./globals.css";

// Force dynamic rendering for all pages — browser-only deps (Rive, Howler) break during SSG
export const dynamic = 'force-dynamic';

const Navigation = nextDynamic(() => import("@/components/Navigation").then(m => m.Navigation), { ssr: false });

const inter = Inter({ subsets: ["latin"], variable: '--font-sans' });

export const metadata: Metadata = {
  title: "Jake Buys It - Instant Cash Offers",
  description: "Show Jake what you got. Get instant cash offers from Jake's AI pawn shop.",
  keywords: ["pawn", "sell", "instant offer", "cash", "buy", "second hand"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Navigation />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
