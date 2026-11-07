import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { SiteShell } from "@/components/casino/site-shell";

export const metadata: Metadata = {
  title: "OpenStake — Original play-money games",
  description: "Ten original play-money games with virtual credits, verifiable results and no real-money wagering.",
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
