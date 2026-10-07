import { SearchErrorMessage } from "@/components/features/chat/SearchErrorMessage";
import { AiResultsList } from "@/components/features/results/AiResultsList";
import { ResultsList } from "@/components/features/results/ResultsList";
import { searchApi } from "@/lib/api/search.api";
import { toSearchError } from "@/lib/api/searchErrors";
import { useChatStore } from "@/lib/stores/chat.store";
import { useSearchStore } from "@/lib/stores/search.store";
import type { SearchMode } from "@/types/search.types";

export function useSearch() {
  // Settings are read when the search starts, so Retry from an older message
  // uses the current weights and results limit.
  async function submitQuery(query: string, modeOverride?: SearchMode) {
    const search = useSearchStore.getState();
    if (!query.trim() || search.isSearching) return;
    const { addUserMessage, addBotMessage } = useChatStore.getState();

    addUserMessage(query);
    // The mode is fixed for this query even if the user switches while it runs.
    const mode = modeOverride ?? search.searchType;
    search.setSearching(true, mode);
    const threadId = useChatStore.getState().threadId;
    // False once the chat was cleared while this search ran: its reply is dropped.
    const stillCurrent = () => useChatStore.getState().threadId === threadId;

    try {
      if (mode === "ai") {
        const data = await searchApi.aiSearch(query.trim(), search.topK);
        if (!stillCurrent()) return;
        search.setResults(
          data.results.map((r) => ({
            candidateId: r.candidateId,
            name: r.name,
            email: r.email ?? undefined,
            phoneNumber: r.phone ?? undefined,
            score: r.relevanceScore ?? 0,
            experienceYears: r.experienceYears ?? undefined,
            content: r.snippet ?? "",
          })),
          data.query,
        );
        addBotMessage(<AiResultsList response={data} />);
        return;
      }

      const data = await searchApi.searchResumes({
        query: query.trim(),
        searchType: mode === "bm25" ? "keyword" : mode, // API naming: 'keyword'
        topK: search.topK,
        bm25Weight: search.bm25Weight / 100,
        vectorWeight: search.vectorWeight / 100,
      });
      if (!stillCurrent()) return;
      search.setResults(data.results, data.query);
      addBotMessage(<ResultsList results={data.results} searchType={mode} duration={data.duration} query={data.query} />);
    } catch (err) {
      if (stillCurrent()) addBotMessage(<SearchErrorMessage error={toSearchError(err)} onRetry={() => submitQuery(query, mode)} />);
    } finally {
      if (stillCurrent()) useSearchStore.getState().setSearching(false);
    }
  }

  return { submitQuery };
}
