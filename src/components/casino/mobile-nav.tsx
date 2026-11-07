"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShieldCheck, Trophy, UserRound, Wallet } from "lucide-react";
import { cn } from "@/lib/client-utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/fairness", label: "Fair", icon: ShieldCheck },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-[#0f212e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition",
                active ? "text-green" : "text-muted hover:text-white",
              )}
            >
              <Icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
