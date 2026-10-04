import { beforeEach, describe, expect, it } from "vitest";
import { useSearchStore } from "@/lib/stores/search.store";

describe("searchStore", () => {
  beforeEach(() => useSearchStore.getState().setSearchType("vector"));

  it("sets search type", () => {
    useSearchStore.getState().setSearchType("hybrid");
    expect(useSearchStore.getState().searchType).toBe("hybrid");
  });

  it("updates weights", () => {
    useSearchStore.getState().setWeights(70, 30);
    expect(useSearchStore.getState().bm25Weight).toBe(70);
    expect(useSearchStore.getState().vectorWeight).toBe(30);
  });

  it("updates topK", () => {
    useSearchStore.getState().setTopK(10);
    expect(useSearchStore.getState().topK).toBe(10);
  });
});
