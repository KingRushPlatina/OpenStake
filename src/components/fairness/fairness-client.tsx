"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, FileCheck2, KeyRound, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/client-utils";

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

type SeedOverview = {
  active: { id: string; serverSeedHash: string; clientSeed: string; nonce: number; createdAt: string } | null;
  history: { id: string; serverSeedHash: string; serverSeed: string | null; clientSeed: string; nonce: number; rotatedAt: string | null }[];
};

export function FairnessClient() {
  const { session, refresh } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [clientSeedDraft, setClientSeedDraft] = useState<string | null>(null);
  const clientSeed = clientSeedDraft ?? session.seed?.clientSeed ?? "";
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
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
      toast.success("Seed rotated", "The previous server seed is now revealed below.");
    },
    onError: (error) => toast.error("Could not rotate seed", error.message),
  });

  const updateClientSeed = useMutation({
    mutationFn: () => apiFetch<{ seed: { clientSeed: string } }>("/api/fairness", { method: "PATCH", body: JSON.stringify({ clientSeed }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fairness"] });
      refresh();
      setClientSeedDraft(null);
      toast.success("Client seed updated", "Your next bets will use the new seed.");
    },
    onError: (error) => toast.error("Could not update seed", error.message),
  });

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    toast.info("Copied", `${label} copied to clipboard.`);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const active = overview.data?.active;
  const history = overview.data?.history ?? [];

  return (
    <div className="space-y-5">
      <section className="surface relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-green/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-green">
            <ShieldCheck className="size-3.5" /> Provably fair
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Your seeds. Your proof.</h1>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">
            Each bet is generated from a server seed, your client seed and a nonce using HMAC-SHA256. The server seed stays
            hidden until you rotate it. After rotation, every previous result can be reproduced.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-green" />
              <p className="text-xs font-bold">Active seed pair</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-green/10 px-2.5 py-1 text-[9px] font-bold text-green">
              <span className="size-1.5 rounded-full bg-green" /> Live
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-wider text-muted/55">Server seed hash</p>
                <button type="button" onClick={() => active && copy(active.serverSeedHash, "Server seed hash")} className="flex items-center gap-1 text-[9px] text-muted hover:text-white">
                  {copied === "Server seed hash" ? <Check className="size-3 text-green" /> : <Copy className="size-3" />} Copy
                </button>
              </div>
              <p className="mt-1.5 break-all rounded-lg bg-[#0f212e] p-3 font-mono text-[10px] leading-5 text-muted">{active?.serverSeedHash ?? "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted/55">Client seed</p>
              <div className="mt-1.5 flex gap-2">
                <input value={clientSeed} onChange={(event) => setClientSeedDraft(event.target.value)} maxLength={64} className="field font-mono text-xs" />
                <button type="button" onClick={() => updateClientSeed.mutate()} disabled={updateClientSeed.isPending || clientSeed.trim().length === 0} className="btn btn-secondary h-11 shrink-0 px-3 text-[10px]">
                  Save
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#0f212e] p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted/55">Nonce</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{active?.nonce?.toLocaleString() ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-[#0f212e] p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted/55">Algorithm</p>
                <p className="mt-1 text-xs font-bold text-white">HMAC-SHA256</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => rotate.mutate()} disabled={rotate.isPending} className="btn btn-primary flex-1 gap-2 text-xs">
              <RefreshCw className={cn("size-3.5", rotate.isPending && "animate-spin")} /> {rotate.isPending ? "Rotating…" : "Rotate & reveal"}
            </button>
            <span className="self-center text-[9px] leading-4 text-muted/55">Rotating invalidates the current seed but keeps all past results verifiable.</span>
          </div>
        </section>

        <section className="surface p-4 sm:p-5">
          <p className="text-xs font-bold">How verification works</p>
          <div className="mt-4 space-y-4">
            {[
              { step: "01", title: "Commit", text: "We generate a server seed and show you only its SHA-256 hash." },
              { step: "02", title: "Mix", text: "Your client seed and the bet nonce are combined with the server seed." },
              { step: "03", title: "Play", text: "HMAC-SHA256 produces deterministic floats that drive the game." },
              { step: "04", title: "Reveal", text: "Rotate the seed to reveal it and reproduce every past result." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-green/10 font-mono text-[9px] font-bold text-green">{item.step}</span>
                <div>
                  <p className="text-[11px] font-bold text-white">{item.title}</p>
                  <p className="mt-0.5 text-[10px] leading-5 text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-3.5 text-muted" />
            <p className="text-xs font-bold">Verify a bet</p>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-muted">Seed data</span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-1.5">
            {(recentBets.data?.bets ?? []).map((bet) => (
              <button
                key={bet.id}
                type="button"
                onClick={() => setSelectedBetId(bet.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-[9px] font-semibold capitalize transition",
                  selectedBetId === bet.id ? "border-green/40 bg-green/10 text-green" : "border-line/60 bg-[#0f212e] text-muted hover:text-white",
                )}
              >
                {bet.gameId.replaceAll("-", " ")} · {new Date(bet.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
            {recentBets.data?.bets.length === 0 ? <p className="text-[10px] text-muted">Place a bet to generate verification data.</p> : null}
          </div>
          {selectedBetId ? (
            <div className="mt-3 rounded-lg border border-line/50 bg-[#0f212e] p-3">
              {verification.isLoading ? <p className="text-[10px] text-muted">Loading verification data…</p> : verification.data ? (
                verification.data.revealed ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-green">Revealed</p>
                      <button
                        type="button"
                        onClick={() => copy(JSON.stringify(verification.data, null, 2), "Verification data")}
                        className="flex items-center gap-1 text-[9px] text-muted hover:text-white"
                      >
                        {copied === "Verification data" ? <Check className="size-3 text-green" /> : <Copy className="size-3" />} Copy data
                      </button>
                    </div>
                    <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] leading-4 text-muted">{JSON.stringify(verification.data, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-[10px] leading-5 text-amber/80">{verification.data.message}</p>
                )
              ) : <p className="text-[10px] text-red">Could not load verification data.</p>}
            </div>
          ) : null}
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-muted" />
            <p className="text-xs font-bold">Previous seed pairs</p>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-muted">{history.length} revealed</span>
        </div>
        {history.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted">Rotate your seed to create the first reveal.</div>
        ) : (
          <div className="divide-y divide-line/35">
            {history.map((seed) => (
              <div key={seed.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-white">{seed.rotatedAt ? new Date(seed.rotatedAt).toLocaleString() : "Revealed seed"}</p>
                  <p className="mt-1 truncate font-mono text-[9px] text-muted/60">hash {seed.serverSeedHash}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/5 px-2 py-1 font-mono text-[9px] text-muted">{seed.clientSeed.slice(0, 12)}…</span>
                  <button type="button" onClick={() => seed.serverSeed && copy(seed.serverSeed, "Server seed")} className="flex items-center gap-1 rounded-md border border-line/60 px-2 py-1 text-[9px] font-semibold text-muted hover:text-white">
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
