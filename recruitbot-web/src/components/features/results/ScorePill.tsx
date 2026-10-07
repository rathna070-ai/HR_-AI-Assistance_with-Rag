import { SEARCH_MODES } from "@/lib/utils/constants";
import { formatScore } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import type { SearchMode } from "@/types/search.types";

const PILL_CLASSES: Record<SearchMode, string> = {
  ai: "text-score-ai-ink bg-score-ai/10",
  vector: "text-score-vector-ink bg-score-vector/10",
  bm25: "text-score-bm25-ink bg-score-bm25/10",
  hybrid: "text-score-hybrid-ink bg-score-hybrid/10",
};

export function ScorePill({ score, searchType }: { score: number; searchType: SearchMode }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5", PILL_CLASSES[searchType])}
      data-testid="score-pill"
    >
      <span className="text-sm font-semibold">{formatScore(score)}</span>
      <span className="text-[11px] opacity-80">{SEARCH_MODES[searchType].scoreLabel}</span>
    </span>
  );
}
