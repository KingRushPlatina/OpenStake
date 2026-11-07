import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/client-utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-muted",
        gold: "border-gold/25 bg-gold/10 text-gold",
        green: "border-green/20 bg-green/10 text-green",
        red: "border-red/20 bg-red/10 text-red",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
