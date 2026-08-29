import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-base font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
  {
    variants: {
      variant: {
        primary: "bg-rose-600 text-white hover:bg-rose-700",
        secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200",
        ghost: "text-stone-700 hover:bg-stone-100",
        danger: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
      },
      size: {
        // Large touch targets by default — the app is mobile-first.
        md: "h-12 px-5",
        sm: "h-9 px-3 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
