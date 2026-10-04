import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchApi } from "@/lib/api/search.api";
import { useChatStore } from "@/lib/stores/chat.store";
import { useSearchStore } from "@/lib/stores/search.store";
import type { SearchResponse } from "@/types/search.types";
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

describe("useSearch", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], threadId: 0 });
    useSearchStore.setState({ isSearching: false, results: [], lastQuery: "" });
    vi.restoreAllMocks();
  });

  it("adds the user message and the bot reply", async () => {
    vi.spyOn(searchApi, "searchResumes").mockResolvedValue(response);
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
