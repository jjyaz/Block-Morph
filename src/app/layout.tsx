import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description:
    "Privacy-preserving Solana identity and access layer for Morph Wallets and issuer-signed capsules.",
  title: "BlockMorph",
};

const links = [
  ["Morph", "/morph"],
  ["My Capsules", "/my-capsules"],
  ["Campaigns", "/campaigns"],
  ["Verify", "/verify"],
  ["Agent Safe", "/agent-safe"],
  ["Docs", "/docs"],
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
      <body className="font-sans antialiased">
        <WalletProvider>
          <div className="min-h-screen bg-neon-grid bg-[length:42px_42px]">
            <header className="sticky top-0 z-40 border-b border-neon/20 bg-black/75 backdrop-blur">
              <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
                <Link className="font-mono text-lg font-semibold tracking-[0.24em] text-neon" href="/">
                  BLOCKMORPH
                </Link>
                <div className="hidden items-center gap-5 text-sm text-green-100/70 md:flex">
                  {links.map(([label, href]) => (
                    <Link className="transition hover:text-neon" href={href} key={href}>
                      {label}
                    </Link>
                  ))}
                </div>
              </nav>
            </header>
            <main>{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
