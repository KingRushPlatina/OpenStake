"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Spade, Trophy, Wallet } from "lucide-react";
import { cn } from "@/lib/client-utils";

const items = [
  { href: "/", label: "Originals", icon: LayoutGrid },
  { href: "/casino/blackjack", label: "Blackjack", icon: Spade },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="grid h-16 grid-cols-4">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/" || (pathname.startsWith("/casino") && pathname !== "/casino/blackjack")
              : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition",
                active ? "text-gold" : "text-muted hover:text-ink",
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
