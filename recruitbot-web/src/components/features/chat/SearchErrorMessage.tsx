import { AlertTriangle, RotateCcw } from "lucide-react";
import type { SearchError } from "@/lib/api/searchErrors";
import { useSearchStore } from "@/lib/stores/search.store";

// A failed search in the chat thread, with Retry when trying again can help.
export function SearchErrorMessage({ error, onRetry }: { error: SearchError; onRetry: () => void }) {
  const isSearching = useSearchStore((s) => s.isSearching);
  return (
    <div className="flex gap-3" role="alert" data-testid="search-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
      <div className="flex flex-col items-start gap-2">
        <div>
          <p className="font-medium text-red-700">{error.title}</p>
          {error.message && <p className="mt-0.5 text-text-muted">{error.message}</p>}
        </div>
        {error.retryable && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isSearching}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry search
          </button>
        )}
      </div>
    </div>
  );
}
