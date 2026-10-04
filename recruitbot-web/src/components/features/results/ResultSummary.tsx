import { Badge } from "@/components/ui/badge";
import { SEARCH_MODES } from "@/lib/utils/constants";
import { formatDuration } from "@/lib/utils/formatters";
import type { SearchMode } from "@/types/search.types";

export function ResultSummary({ count, searchType, duration }: { count: number; searchType: SearchMode; duration: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted" data-testid="result-summary">
      <span>
        Found <strong className="text-text-primary">{count}</strong> {count === 1 ? "candidate" : "candidates"}
      </span>
      <span aria-hidden>·</span>
      <Badge variant={searchType}>{SEARCH_MODES[searchType].label}</Badge>
      <span aria-hidden>·</span>
      <span>{formatDuration(duration)}</span>
    </div>
  );
}
