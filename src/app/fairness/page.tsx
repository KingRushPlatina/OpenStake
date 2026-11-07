import type { Metadata } from "next";
import { FairnessClient } from "@/components/fairness/fairness-client";

export const metadata: Metadata = {
  title: "Provably fair — OpenStake",
  description: "Inspect and rotate your provably fair seed pair.",
};

export default function FairnessPage() {
  return <FairnessClient />;
}
