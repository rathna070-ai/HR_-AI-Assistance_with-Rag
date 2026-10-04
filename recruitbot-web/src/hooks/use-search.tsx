import { ResultsList } from "@/components/features/results/ResultsList";
import { searchApi } from "@/lib/api/search.api";
import { useChatStore } from "@/lib/stores/chat.store";
import { useSearchStore } from "@/lib/stores/search.store";

export function useSearch() {
  const { searchType, bm25Weight, vectorWeight, topK, setSearching, setResults } = useSearchStore();
  const { addUserMessage, addBotMessage } = useChatStore();

  async function submitQuery(query: string) {
    if (!query.trim() || useSearchStore.getState().isSearching) return;

    addUserMessage(query);
    setSearching(true);
    const threadId = useChatStore.getState().threadId;
    // False once the chat was cleared while this search ran: its reply is dropped.
    const stillCurrent = () => useChatStore.getState().threadId === threadId;
    // The mode is fixed for this query even if the user switches while it runs.
    const mode = searchType;

    try {
      const data = await searchApi.searchResumes({
        query: query.trim(),
        searchType: mode === "bm25" ? "keyword" : mode, // API naming: 'keyword'
        topK,
        bm25Weight: bm25Weight / 100,
        vectorWeight: vectorWeight / 100,
      });
      if (!stillCurrent()) return;
      setResults(data.results, data.query);
      addBotMessage(<ResultsList results={data.results} searchType={mode} duration={data.duration} query={data.query} />);
    } catch {
      if (stillCurrent()) addBotMessage(<p className="text-red-600">Search failed. Please try again.</p>);
    } finally {
      if (stillCurrent()) setSearching(false);
    }
  }

  return { submitQuery };
}
