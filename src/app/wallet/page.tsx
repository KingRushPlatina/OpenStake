import type { Metadata } from "next";
import { WalletClient } from "@/components/wallet/wallet-client";

export const metadata: Metadata = {
  title: "Wallet — OpenStake",
  description: "Your play-money balance, faucet and transaction history.",
};

export default function WalletPage() {
  return <WalletClient />;
}
