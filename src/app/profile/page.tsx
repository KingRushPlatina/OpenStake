import type { Metadata } from "next";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = {
  title: "My stats — OpenStake",
  description: "Your temporary OpenStake profile and betting statistics.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
