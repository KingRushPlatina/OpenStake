"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useSession } from "@/components/session-provider";

export function SeedPanel() {
  const { session } = useSession();
  return (
    <section className="surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-green" />
          <p className="text-[11px] font-bold">Provably fair</p>
        </div>
        <Link href="/fairness" className="text-[9px] font-bold text-green hover:text-[#7dffa7]">
          Manage
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted/60">Server seed hash</p>
          <p className="mt-0.5 break-all font-mono text-[10px] leading-4 text-muted">{session.seed?.serverSeedHash ?? "Rotating…"}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-muted/60">Client seed</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted">{session.seed?.clientSeed ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-muted/60">Nonce</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">{session.seed?.nonce?.toLocaleString() ?? "0"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
