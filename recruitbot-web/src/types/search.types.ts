// "ai" is the end-to-end pipeline (POST /v1/search): BM25 + vector, merged,
// de-duplicated by person, re-ranked and summarized by the LLM.
export type SearchMode = "ai" | "vector" | "bm25" | "hybrid";

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

// ---- AI Search ----

export interface DuplicateResume {
  resumeId: string;
  fileName: string | null;
}

export interface AiSearchResult {
  rank: number;
  candidateId: string;
  name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  experienceYears: number | null;
  skills: string[];
  matchedSkills: string[];
  sources: ("bm25" | "vector")[];
  // Null when AI re-ranking was unavailable for this search.
  relevanceScore: number | null;
  reason: string | null;
  bm25Score: number | null;
  vectorScore: number | null;
  snippet: string | null;
  duplicates: DuplicateResume[];
}

export interface AiPipelineStats {
  retrieved: { bm25: number; vector: number };
  uniqueResumes: number;
  duplicatesMerged: number;
  reranked: number;
  returned: number;
}

export interface AiSearchResponse {
  query: string;
  results: AiSearchResult[];
  degraded: boolean;
  warnings: string[];
  vectorFallback: boolean;
  bm25Fallback: boolean;
  pipeline: AiPipelineStats;
  // Round trip measured in the browser.
  duration: number;
}

export interface ShortlistSummary {
  overall: string;
  results: { resumeId: string; summary: string }[];
}
