import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/client-utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border text-[13px] font-semibold transition disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-gold text-[#14100a] hover:bg-gold-strong",
        secondary: "border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-surface-3",
        outline: "border-line-strong bg-transparent text-ink hover:bg-surface-2",
        ghost: "border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-ink",
        danger: "border-red/25 bg-red/10 text-red hover:bg-red/15",
      },
      size: {
        sm: "h-9 px-3 text-[12px]",
        md: "h-11 px-4",
        lg: "h-12 px-5 text-sm",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
