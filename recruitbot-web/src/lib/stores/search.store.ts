import { create } from "zustand";
import type { SearchMode, SearchResult } from "@/types/search.types";

interface SearchState {
  searchType: SearchMode;
  bm25Weight: number;
  vectorWeight: number;
  topK: number;
  results: SearchResult[];
  isSearching: boolean;
  // Mode of the search in progress, for the loading message.
  searchingMode: SearchMode | null;
  lastQuery: string;
  setSearchType: (mode: SearchMode) => void;
  setWeights: (bm25: number, vector: number) => void;
  setTopK: (k: number) => void;
  setResults: (results: SearchResult[], query: string) => void;
  setSearching: (v: boolean, mode?: SearchMode) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchType: "ai",
  bm25Weight: 50,
  vectorWeight: 50,
  topK: 5,
  results: [],
  isSearching: false,
  searchingMode: null,
  lastQuery: "",
  setSearchType: (mode) => set({ searchType: mode }),
  setWeights: (bm25, vector) => set({ bm25Weight: bm25, vectorWeight: vector }),
  setTopK: (k) => set({ topK: k }),
  setResults: (results, query) => set({ results, lastQuery: query }),
  setSearching: (v, mode) => set({ isSearching: v, searchingMode: v ? (mode ?? null) : null }),
}));
