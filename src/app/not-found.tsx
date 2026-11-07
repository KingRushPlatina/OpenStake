import Link from "next/link";
import { Compass } from "lucide-react";
import { BrandMark } from "@/components/casino/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="surface max-w-md p-8 text-center">
        <BrandMark className="mx-auto" />
        <p className="mt-5 font-display text-5xl font-bold tracking-[-0.05em]">404</p>
        <h1 className="mt-2 font-display text-xl font-bold">This table does not exist</h1>
        <p className="mt-2 text-xs leading-5 text-muted">The page may have moved, or the game is not part of the OpenStake floor.</p>
        <Link href="/" className="btn btn-primary mt-6 w-full">
          <Compass className="size-4" /> Back to the casino
        </Link>
      </div>
    </div>
  );
}
