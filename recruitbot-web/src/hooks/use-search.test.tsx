import { AxiosError } from "axios";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchApi } from "@/lib/api/search.api";
import { useChatStore } from "@/lib/stores/chat.store";
import { useSearchStore } from "@/lib/stores/search.store";
import type { AiSearchResponse, SearchResponse } from "@/types/search.types";
import { useSearch } from "./use-search";

const response: SearchResponse = {
  query: "java",
  searchType: "vector",
  topK: 5,
  resultCount: 0,
  duration: 10,
  results: [],
  metadata: {},
};

const aiResponse: AiSearchResponse = {
  query: "java",
  results: [],
  degraded: false,
  warnings: [],
  vectorFallback: false,
  bm25Fallback: false,
  pipeline: { retrieved: { bm25: 0, vector: 0 }, uniqueResumes: 0, duplicatesMerged: 0, reranked: 0, returned: 0 },
  duration: 10,
};

describe("useSearch", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], threadId: 0 });
    useSearchStore.setState({ searchType: "vector", isSearching: false, searchingMode: null, results: [], lastQuery: "", topK: 5 });
    vi.restoreAllMocks();
  });

  it("adds the user message and the bot reply", async () => {
    vi.spyOn(searchApi, "searchResumes").mockResolvedValue(response);
    const { result } = renderHook(() => useSearch());
    await act(() => result.current.submitQuery("java"));
    expect(useChatStore.getState().messages.map((m) => m.type)).toEqual(["user", "bot"]);
    expect(useSearchStore.getState().isSearching).toBe(false);
  });

  it("uses the end-to-end pipeline in AI Search mode, with the results limit", async () => {
    useSearchStore.setState({ searchType: "ai", topK: 10 });
    const aiSearch = vi.spyOn(searchApi, "aiSearch").mockResolvedValue(aiResponse);
    const searchResumes = vi.spyOn(searchApi, "searchResumes");
    const { result } = renderHook(() => useSearch());
    await act(() => result.current.submitQuery("java"));
    expect(aiSearch).toHaveBeenCalledWith("java", 10);
    expect(searchResumes).not.toHaveBeenCalled();
    expect(useChatStore.getState().messages.map((m) => m.type)).toEqual(["user", "bot"]);
  });

  it("records the running mode for the loading message", async () => {
    useSearchStore.setState({ searchType: "ai" });
    let resolve!: (r: AiSearchResponse) => void;
    vi.spyOn(searchApi, "aiSearch").mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useSearch());
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.submitQuery("java");
    });
    expect(useSearchStore.getState().searchingMode).toBe("ai");
    await act(async () => {
      resolve(aiResponse);
      await pending;
    });
    expect(useSearchStore.getState().searchingMode).toBeNull();
  });

  it("replies with an error message instead of throwing when the search fails", async () => {
    vi.spyOn(searchApi, "searchResumes").mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"));
    const { result } = renderHook(() => useSearch());
    await act(() => result.current.submitQuery("java"));
    expect(useChatStore.getState().messages.map((m) => m.type)).toEqual(["user", "bot"]);
    expect(useSearchStore.getState().isSearching).toBe(false);
  });

  it("drops the reply of a search that was running when the chat was cleared", async () => {
    let resolve!: (r: SearchResponse) => void;
    vi.spyOn(searchApi, "searchResumes").mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useSearch());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.submitQuery("java");
    });
    act(() => {
      useChatStore.getState().clearMessages();
      useSearchStore.getState().setSearching(false);
    });
    await act(async () => {
      resolve(response);
      await pending;
    });

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useSearchStore.getState().lastQuery).toBe("");
  });
});
