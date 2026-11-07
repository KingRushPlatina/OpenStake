import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGameMetadata } from "@/modules/games/catalog";
import { GameRouter } from "@/components/games/game-router";

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game } = await params;
  const metadata = getGameMetadata(game);
  return {
    title: metadata ? `${metadata.name} — OpenStake` : "Game not found — OpenStake",
    description: metadata?.description,
  };
}

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const metadata = getGameMetadata(game);
  if (!metadata) notFound();
  return <GameRouter game={metadata} />;
}
