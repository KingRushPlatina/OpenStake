import Link from "next/link";
import { Compass } from "lucide-react";
import { BrandMark } from "@/components/casino/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="surface w-full max-w-md p-8 text-center">
        <BrandMark className="mx-auto" />
        <p className="mt-6 font-display text-5xl text-gold/80">404</p>
        <h1 className="mt-2 font-display text-2xl text-ink">This table does not exist</h1>
        <p className="mt-2 text-[11px] leading-5 text-muted">The page may have moved, or the table is not part of the OpenStake floor.</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/">
            <Compass className="size-4" /> Back to the lobby
          </Link>
        </Button>
      </div>
    </div>
  );
}
