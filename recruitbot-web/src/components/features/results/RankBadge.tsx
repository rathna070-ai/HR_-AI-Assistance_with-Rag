import { cn } from "@/lib/utils/cn";

export function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        rank <= 3 ? "bg-gradient-to-br from-primary to-accent text-white" : "bg-white/[0.08] text-text-muted",
      )}
      aria-label={`Rank ${rank}`}
    >
      #{rank}
    </span>
  );
}
