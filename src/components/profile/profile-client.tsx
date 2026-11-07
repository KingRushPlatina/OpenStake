"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Pencil, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarPicker, type AvatarSelection } from "@/components/avatars/avatar-picker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/components/session-provider";
import { getGameMetadata } from "@/modules/games/catalog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import type { SessionPayload } from "@/types/api";
import type { PublicBet } from "@/modules/games/types";
import { toAvatarPreset } from "@/modules/identity/avatars";

export function ProfileClient() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.user.name);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const currentPreset = toAvatarPreset(session.user.avatarPreset);
  const [avatar, setAvatar] = useState<AvatarSelection>({ preset: currentPreset, image: null });
  const history = useQuery({
    queryKey: ["history", "profile"],
    queryFn: () => apiFetch<{ history: PublicBet[] }>("/api/history?limit=20"),
  });
  const rename = useMutation({
    mutationFn: () => apiFetch<SessionPayload>("/api/me", { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["session"], payload);
      setEditing(false);
      toast.success("Seat name updated", { description: `You are now ${payload.user.name}.` });
    },
    onError: (error) => toast.error("Could not update name", { description: error.message }),
  });
  const updateAvatar = useMutation({
    mutationFn: () =>
      apiFetch<SessionPayload>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          avatarPreset: avatar.image ? null : avatar.preset,
          avatarImage: avatar.image,
        }),
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["session"], payload);
      setAvatarOpen(false);
      toast.success("Avatar updated");
    },
    onError: (error) => toast.error("Could not update avatar", { description: error.message }),
  });

  const openAvatar = () => {
    setAvatar({ preset: currentPreset, image: null });
    setAvatarOpen(true);
  };
  const bets = history.data?.history ?? [];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 border-b border-line/70 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar
              name={session.user.name}
              userId={session.user.id}
              avatarPreset={session.user.avatarPreset}
              avatarUrl={session.user.avatarUrl}
              size="xl"
            />
            <button
              type="button"
              onClick={openAvatar}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-line bg-surface-2 text-muted transition hover:border-line-strong hover:text-ink"
            >
              <Camera className="size-3" />
            </button>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/70">Temporary seat</p>
            {editing ? (
              <div className="mt-2 flex max-w-xs items-center gap-2">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={16} className="field h-10 text-sm" autoFocus />
                <Button type="button" size="icon" disabled={rename.isPending} onClick={() => rename.mutate()}>
                  <Check className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-3xl text-ink sm:text-4xl">{session.user.name}</h1>
                <button
                  type="button"
                  onClick={() => {
                    setName(session.user.name);
                    setEditing(true);
                  }}
                  className="rounded-lg p-1.5 text-muted/50 transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Edit name"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-muted/50">Created {new Date(session.user.createdAt).toLocaleDateString()} · no signup required</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/leaderboard"><Trophy className="size-3.5 text-gold" /> Leaderboard</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/fairness"><ShieldCheck className="size-3.5 text-green" /> Fairness</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Net profit", value: formatCents(session.stats.netProfitCents), tone: session.stats.netProfitCents >= 0 ? "text-green" : "text-red" },
          { label: "Total wagered", value: formatCents(session.stats.wageredCents, { compact: true }), tone: "text-ink" },
          { label: "Rounds played", value: session.stats.totalBets.toLocaleString(), tone: "text-ink" },
          { label: "Best return", value: formatMultiplier(session.stats.biggestMultiplier), tone: "text-gold" },
        ].map((stat) => (
          <div key={stat.label} className="border-l border-line/70 pl-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">{stat.label}</p>
            <p className={cn("mt-2 font-display text-2xl tabular-nums", stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Recent rounds</p>
          <span className="text-[9px] uppercase tracking-[0.14em] text-muted/45">Across the table</span>
        </div>
        {bets.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center gap-3">
            <p className="text-[11px] text-muted/60">No rounds yet.</p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/casino/blackjack">Take a seat</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left">
              <thead>
                <tr className="text-[8px] uppercase tracking-[0.16em] text-muted/40">
                  <th className="px-5 py-3 font-medium">Game</th>
                  <th className="px-3 py-3 text-right font-medium">Stake</th>
                  <th className="px-3 py-3 text-right font-medium">Return</th>
                  <th className="px-3 py-3 text-right font-medium">Multiplier</th>
                  <th className="px-5 py-3 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {bets.map((bet) => {
                  const profit = bet.payoutCents - bet.amountCents;
                  const active = bet.status === "active";
                  return (
                    <tr key={bet.id} className="text-[11px] transition hover:bg-white/[0.015]">
                      <td className="px-5 py-3 font-medium text-ink">
                        {getGameMetadata(bet.gameId)?.name ?? bet.gameId}
                        {active ? <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-gold">Live</span> : null}
                      </td>
                      <td className="px-3 py-3 text-right text-muted tabular-nums">{formatCents(bet.amountCents)}</td>
                      <td className={cn("px-3 py-3 text-right font-semibold tabular-nums", active ? "text-gold/70" : profit > 0 ? "text-green" : profit === 0 ? "text-ink" : "text-muted/60")}>
                        {active ? "In play" : formatCents(bet.payoutCents)}
                      </td>
                      <td className="px-3 py-3 text-right text-muted tabular-nums">{formatMultiplier(bet.multiplier)}</td>
                      <td className="px-5 py-3 text-right text-[9px] text-muted/45">
                        {new Date(bet.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="p-6 sm:p-7">
          <DialogTitle className="font-display text-2xl">Change avatar</DialogTitle>
          <DialogDescription className="mt-1.5">
            Pick a preset or upload a photo. Your seat updates everywhere instantly.
          </DialogDescription>
          <div className="mt-5">
            <AvatarPicker value={avatar} onChange={setAvatar} disabled={updateAvatar.isPending} />
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAvatarOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={updateAvatar.isPending} onClick={() => updateAvatar.mutate()}>
              {updateAvatar.isPending ? "Saving…" : "Save avatar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
