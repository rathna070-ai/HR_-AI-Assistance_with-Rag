import { EmptyState } from "@/components/common/EmptyState";
import { useUiStore } from "@/lib/stores/ui.store";
import type { SearchMode, SearchResult } from "@/types/search.types";
import { ResultCard } from "./ResultCard";
import { ResultSummary } from "./ResultSummary";

interface ResultsListProps {
  results: SearchResult[];
  searchType: SearchMode;
  duration: number;
  query: string;
}

export function ResultsList({ results, searchType, duration, query }: ResultsListProps) {
  // Cards open the shared candidate modal (rendered once by ChatPage).
  const openModal = useUiStore((s) => s.openModal);

  return (
    <div className="flex flex-col gap-3" data-testid="results-list" data-query={query}>
      <ResultSummary count={results.length} searchType={searchType} duration={duration} />
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        results.map((result, i) => (
          <ResultCard key={result.candidateId} result={result} rank={i + 1} searchType={searchType} onSelect={openModal} index={i} />
        ))
      )}
    </div>
  );
}
