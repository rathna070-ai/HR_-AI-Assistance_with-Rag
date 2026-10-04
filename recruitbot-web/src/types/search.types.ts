export type SearchMode = "vector" | "bm25" | "hybrid";

// Frontend request (from the frontend doc). The backend has no single
// /search/resumes endpoint; lib/api/search.api.ts maps this onto
// /v1/search/vector, /v1/search/bm25 and /v1/search/hybrid.
export interface SearchRequest {
  query: string;
  searchType: "vector" | "keyword" | "hybrid";
  topK: number;
  bm25Weight?: number;
  vectorWeight?: number;
}

export interface SearchResult {
  candidateId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  score: number;
  experienceYears?: number;
  content: string;
}

export interface SearchResponse {
  query: string;
  searchType: string;
  topK: number;
  resultCount: number;
  duration: number;
  results: SearchResult[];
  metadata?: Record<string, unknown>;
}
