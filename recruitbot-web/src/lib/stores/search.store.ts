import { create } from "zustand";
import type { SearchMode, SearchResult } from "@/types/search.types";

interface SearchState {
  searchType: SearchMode;
  bm25Weight: number;
  vectorWeight: number;
  topK: number;
  results: SearchResult[];
  isSearching: boolean;
  lastQuery: string;
  setSearchType: (mode: SearchMode) => void;
  setWeights: (bm25: number, vector: number) => void;
  setTopK: (k: number) => void;
  setResults: (results: SearchResult[], query: string) => void;
  setSearching: (v: boolean) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchType: "vector",
  bm25Weight: 50,
  vectorWeight: 50,
  topK: 5,
  results: [],
  isSearching: false,
  lastQuery: "",
  setSearchType: (mode) => set({ searchType: mode }),
  setWeights: (bm25, vector) => set({ bm25Weight: bm25, vectorWeight: vector }),
  setTopK: (k) => set({ topK: k }),
  setResults: (results, query) => set({ results, lastQuery: query }),
  setSearching: (v) => set({ isSearching: v }),
}));
