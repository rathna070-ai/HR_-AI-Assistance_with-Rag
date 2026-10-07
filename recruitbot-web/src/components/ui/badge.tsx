import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      neutral: "bg-slate-100 text-text-muted",
      ai: "bg-score-ai/15 text-score-ai-ink",
      vector: "bg-score-vector/20 text-score-vector-ink",
      bm25: "bg-score-bm25/20 text-score-bm25-ink",
      hybrid: "bg-score-hybrid/20 text-score-hybrid-ink",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
