"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { AvatarPicker, type AvatarSelection } from "@/components/avatars/avatar-picker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { defaultAvatarPreset } from "@/modules/identity/avatars";
import type { SessionPayload } from "@/types/api";

export function OnboardingGate() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarSelection>({ preset: defaultAvatarPreset, image: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session.user.onboarded) return null;

  const trimmed = name.trim();
  const nameValid = /^[a-zA-Z0-9_]{3,16}$/.test(trimmed);

  const submit = async () => {
    if (!nameValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await apiFetch<SessionPayload>("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          avatarPreset: avatar.image ? null : avatar.preset,
          avatarImage: avatar.image,
        }),
      });
      queryClient.setQueryData(["session"], payload);
      toast.success(`Welcome, ${payload.user.name}`, {
        description: "Your seat is ready. Good luck on the floor.",
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not save your seat. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="p-0"
      >
        <div className="relative overflow-hidden border-b border-line/70 px-6 py-6 sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-gold/[0.07] blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="relative grid size-10 place-items-center rounded-xl border border-gold/30 bg-[#11150f] font-display text-xl text-gold">
              <span className="absolute inset-[3px] rounded-[9px] border border-gold/10" />
              <span className="relative">O</span>
            </span>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-gold/75">OpenStake Originals</p>
              <p className="mt-0.5 text-[10px] text-muted/55">No password. No email. Just your seat.</p>
            </div>
          </div>
          <DialogTitle className="relative mt-6 font-display text-[30px] leading-tight sm:text-[34px]">
            Set up your seat
          </DialogTitle>
          <DialogDescription className="relative mt-2 max-w-sm">
            Pick a name and a meme-ready avatar. Everything is play money and your seat lives in this browser.
          </DialogDescription>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="seat-name" className="text-[10px] font-medium text-muted">
                Display name
              </label>
              <span className="text-[9px] text-muted/40">{trimmed.length}/16</span>
            </div>
            <input
              id="seat-name"
              value={name}
              maxLength={16}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. MidnightAce"
              onChange={(event) => setName(event.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              className="mt-2 h-12 w-full rounded-xl border border-line bg-[#0a0e0c] px-3.5 text-[15px] font-semibold text-ink outline-none transition placeholder:font-normal placeholder:text-muted/30 focus:border-gold/45"
            />
            {trimmed.length > 0 && !nameValid ? (
              <p className="mt-1.5 text-[9px] text-red/80">Use 3–16 letters, numbers or underscores.</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Avatar</p>
            <AvatarPicker value={avatar} onChange={setAvatar} disabled={saving} />
          </div>

          {error ? (
            <p className="rounded-lg border border-red/25 bg-red/[0.07] px-3 py-2 text-[10px] text-red/90">{error}</p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={!nameValid || saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold text-[12px] font-semibold text-[#14100a] transition hover:bg-gold-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving your seat…" : "Enter the floor"}
            {!saving ? <ArrowRight className="size-4" /> : null}
          </button>

          <p className="text-center text-[9px] leading-4 text-muted/40">
            Temporary play-money account. No deposits, withdrawals or real-money prizes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
