"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, FileCheck2, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { getGameMetadata } from "@/modules/games/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/client-utils";

type SeedOverview = {
  active: { id: string; serverSeedHash: string; clientSeed: string; nonce: number; createdAt: string } | null;
  history: { id: string; serverSeedHash: string; serverSeed: string | null; clientSeed: string; nonce: number; rotatedAt: string | null }[];
};

type BetSummary = { id: string; gameId: string; status: string; payoutCents: number; createdAt: string };

type BetVerification = {
  revealed: boolean;
  betId?: string;
  gameId: string;
  status?: string;
  serverSeedHash: string | null;
  serverSeed?: string;
  clientSeed: string | null;
  nonce: number;
  gameInput?: unknown;
  result?: unknown;
  payoutCents?: number;
  formula?: string;
  message?: string;
};

const steps = [
  { step: "01", title: "Commit", text: "We generate a server seed and publish only its SHA-256 hash before you play." },
  { step: "02", title: "Mix", text: "Your client seed and the bet nonce are combined with the server seed." },
  { step: "03", title: "Play", text: "HMAC-SHA256 produces the deterministic floats that drive every game engine." },
  { step: "04", title: "Reveal", text: "Rotate the pair to reveal the server seed and reproduce every previous round." },
];

export function FairnessClient() {
  const { session, refresh } = useSession();
  const queryClient = useQueryClient();
  const [clientSeedDraft, setClientSeedDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
  const clientSeed = clientSeedDraft ?? session.seed?.clientSeed ?? "";
  const overview = useQuery({
    queryKey: ["fairness"],
    queryFn: () => apiFetch<SeedOverview>("/api/fairness"),
  });
  const recentBets = useQuery({
    queryKey: ["fairness-bets"],
    queryFn: () => apiFetch<{ bets: BetSummary[] }>("/api/fairness/bets?limit=8"),
  });
  const verification = useQuery({
    queryKey: ["fairness-bet", selectedBetId],
    queryFn: () => apiFetch<BetVerification>(`/api/fairness/bets/${selectedBetId}`),
    enabled: Boolean(selectedBetId),
  });

  const rotate = useMutation({
    mutationFn: () => apiFetch<{ previous: { serverSeed: string }; active: { serverSeedHash: string } }>("/api/fairness", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fairness"] });
      queryClient.invalidateQueries({ queryKey: ["fairness-bet"] });
      refresh();
      toast.success("Seed rotated", { description: "The previous server seed is now revealed below." });
    },
    onError: (error) => toast.error("Could not rotate seed", { description: error.message }),
  });

  const updateClientSeed = useMutation({
    mutationFn: () => apiFetch<{ seed: { clientSeed: string } }>("/api/fairness", { method: "PATCH", body: JSON.stringify({ clientSeed }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fairness"] });
      refresh();
      setClientSeedDraft(null);
      toast.success("Client seed updated", { description: "Your next round will use the new seed." });
    },
    onError: (error) => toast.error("Could not update seed", { description: error.message }),
  });

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    toast.info(`${label} copied`);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const active = overview.data?.active;
  const history = overview.data?.history ?? [];

  return (
    <div className="space-y-8">
      <section className="border-b border-line/70 pb-8">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-gold/50" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-gold/80">Provably fair</span>
        </div>
        <h1 className="mt-4 max-w-2xl text-4xl text-ink sm:text-5xl">Every result, accounted for.</h1>
        <p className="mt-4 max-w-2xl text-[12px] leading-6 text-muted">
          Every outcome comes from a committed server seed, your client seed and a bet nonce. The server seed stays
          hidden until you rotate it. After rotation, every input, result and payout can be reproduced.
        </p>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <KeyRound className="size-4 text-gold" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Active seed pair</p>
            </div>
            <Badge tone="green"><span className="size-1.5 rounded-full bg-green" /> Live</Badge>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Server seed hash</p>
                <button type="button" onClick={() => active && copy(active.serverSeedHash, "Server seed hash")} className="flex items-center gap-1 text-[9px] text-muted/60 transition hover:text-ink">
                  {copied === "Server seed hash" ? <Check className="size-3 text-green" /> : <Copy className="size-3" />} Copy
                </button>
              </div>
              <p className="mt-2 break-all rounded-xl border border-line/60 bg-[#0a0e0c] p-3.5 font-mono text-[10px] leading-5 text-muted/75">{active?.serverSeedHash ?? "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Client seed</p>
              <div className="mt-2 flex gap-2">
                <input value={clientSeed} onChange={(event) => setClientSeedDraft(event.target.value)} maxLength={64} className="field font-mono text-[11px]" />
                <Button type="button" variant="secondary" size="md" disabled={updateClientSeed.isPending || clientSeed.trim().length === 0} onClick={() => updateClientSeed.mutate()} className="shrink-0 px-4 text-[10px]">
                  Save
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line/60 bg-surface-2/50 p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted/45">Nonce</p>
                <p className="mt-1.5 font-display text-lg text-ink tabular-nums">{active?.nonce?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-line/60 bg-surface-2/50 p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted/45">Algorithm</p>
                <p className="mt-1.5 text-[11px] font-medium text-ink">HMAC-SHA256</p>
              </div>
              <div className="rounded-xl border border-line/60 bg-surface-2/50 p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted/45">Scope</p>
                <p className="mt-1.5 text-[11px] font-medium text-ink">All originals</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" onClick={() => rotate.mutate()} disabled={rotate.isPending} className="gap-2">
              <RefreshCw className={cn("size-3.5", rotate.isPending && "animate-spin")} />
              {rotate.isPending ? "Rotating…" : "Rotate & reveal"}
            </Button>
            <p className="text-[9px] leading-4 text-muted/45">Rotating retires the current pair and keeps every past round verifiable.</p>
          </div>
        </section>

        <section className="surface p-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-green" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">How verification works</p>
          </div>
          <div className="mt-6 space-y-5">
            {steps.map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-gold/15 bg-gold/5 font-mono text-[9px] text-gold/70">{item.step}</span>
                <div>
                  <p className="text-[11px] font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-[10px] leading-5 text-muted/60">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="size-3.5 text-gold/70" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Verify a round</p>
          </div>
          <span className="text-[9px] uppercase tracking-[0.14em] text-muted/40">Seed data</span>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-1.5">
            {(recentBets.data?.bets ?? []).map((bet) => (
              <button
                key={bet.id}
                type="button"
                onClick={() => setSelectedBetId(bet.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[9px] font-medium transition",
                  selectedBetId === bet.id ? "border-gold/40 bg-gold/10 text-gold" : "border-line bg-surface-2 text-muted hover:text-ink",
                )}
              >
                {getGameMetadata(bet.gameId)?.name ?? bet.gameId} · {new Date(bet.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
            {recentBets.data?.bets.length === 0 ? <p className="text-[10px] text-muted/55">Play a round to generate verification data.</p> : null}
          </div>
          {selectedBetId ? (
            <div className="mt-4 rounded-xl border border-line/60 bg-[#0a0e0c] p-4">
              {verification.isLoading ? (
                <p className="text-[10px] text-muted/55">Loading verification data…</p>
              ) : verification.data ? (
                verification.data.revealed ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-green">
                        {getGameMetadata(verification.data.gameId)?.name ?? "Round"} · Revealed
                      </p>
                      <button
                        type="button"
                        onClick={() => copy(JSON.stringify(verification.data, null, 2), "Verification data")}
                        className="flex items-center gap-1 text-[9px] text-muted/60 transition hover:text-ink"
                      >
                        {copied === "Verification data" ? <Check className="size-3 text-green" /> : <Copy className="size-3" />} Copy data
                      </button>
                    </div>
                    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] leading-4 text-muted/65">{JSON.stringify(verification.data, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-[10px] leading-5 text-gold/75">{verification.data.message}</p>
                )
              ) : (
                <p className="text-[10px] text-red/80">Could not load verification data.</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Previous seed pairs</p>
          <span className="text-[9px] uppercase tracking-[0.14em] text-muted/40">{history.length} revealed</span>
        </div>
        {history.length === 0 ? (
          <div className="py-14 text-center text-[11px] text-muted/55">Rotate your seed to create the first reveal.</div>
        ) : (
          <div className="divide-y divide-line/40">
            {history.map((seed) => (
              <div key={seed.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-ink">{seed.rotatedAt ? new Date(seed.rotatedAt).toLocaleString() : "Revealed seed"}</p>
                  <p className="mt-1 truncate font-mono text-[9px] text-muted/45">hash {seed.serverSeedHash}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] text-muted/60">{seed.clientSeed.slice(0, 12)}…</span>
                  <button type="button" onClick={() => seed.serverSeed && copy(seed.serverSeed, "Server seed")} className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[9px] font-medium text-muted transition hover:text-ink">
                    {copied === "Server seed" ? <Check className="size-3 text-green" /> : <Copy className="size-3" />} Server seed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
