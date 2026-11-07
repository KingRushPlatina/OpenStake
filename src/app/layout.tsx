import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { SiteShell } from "@/components/casino/site-shell";

export const metadata: Metadata = {
  title: "OpenStake — Provably fair social casino",
  description: "Play original casino games with virtual credits. No real money, just pure gameplay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
      </body>
    </html>
  );
}
