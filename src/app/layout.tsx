import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { SiteShell } from "@/components/casino/site-shell";

export const metadata: Metadata = {
  title: "OpenStake — Blackjack, dealt properly",
  description: "A private blackjack table with virtual credits, verifiable deals and no real-money wagering.",
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
