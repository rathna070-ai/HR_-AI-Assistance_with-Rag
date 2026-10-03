// Shapes used by the retrieval module. Later phases add their own types here.

export interface RetrievalErrorBody {
  success: false;
  errorCode: string;
  message: string;
}

// Phase 3: POST /v1/embeddings
export interface EmbeddingRequest {
  model: string;
  input: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
}

// Phase 5 / 6 / 8 requests
export interface SearchFilters {
  minYearsExperience?: number;
}

export interface SearchRequest {
  query: string;
  topK: number;
  filters: SearchFilters;
}

export interface VectorSearchRequest extends SearchRequest {
  exactRescore: boolean;
}

// Phase 7: one shape for BM25 and vector candidates.
export type CandidateSource = "bm25" | "vector";

export interface SearchCandidate {
  resumeId: string;
  name?: string;
  role?: string;
  company?: string;
  skills?: string[];
  totalExperience?: number | null;
  snippet?: string;
  bm25Score?: number;
  vectorScore?: number;
  sources: CandidateSource[];
}

// Phase 5: POST /v1/search/bm25
export interface Bm25Result {
  resumeId: string;
  name: string | null;
  role: string | null;
  score: number;
  matchedSkills: string[];
}

export interface Bm25Response {
  mode: "bm25";
  query: string;
  count: number;
  results: Bm25Result[];
}

// Phase 6: POST /v1/search/vector
export interface VectorResult {
  resumeId: string;
  name: string | null;
  role: string | null;
  vectorScore: number;
}

export interface VectorResponse {
  mode: "vector";
  count: number;
  results: VectorResult[];
}

// Phase 8: POST /v1/search/hybrid
export interface HybridListItem {
  resumeId: string;
  name: string | null;
  score: number;
}

export interface HybridTimings {
  bm25Ms: number;
  embeddingMs: number;
  vectorMs: number;
}

export interface HybridResponse extends HybridDebugFlags {
  mode: "hybrid-debug";
  bm25: HybridListItem[];
  vector: HybridListItem[];
  timings: HybridTimings;
}

export interface HybridDebugFlags {
  degraded: boolean;
  bm25Fallback?: true;
  vectorFallback?: true;
}

// Phase 10: LLMService
export interface RerankResult {
  resumeId: string;
  rank: number;
  relevanceScore: number;
  reason: string;
}

export interface RerankOutput {
  results: RerankResult[];
  model: string;
}

export type SummaryStyle = "short" | "detailed";

export interface SummaryOptions {
  style: SummaryStyle;
  maxTokens: number;
}

export interface CandidateSummary {
  resumeId: string;
  summary: string;
}

export interface ResumeMetadata {
  jobTitles: string[];
  skills: string[];
  totalExperience: number | null;
  experienceSummary: string | null;
}

// Phase 11: POST /v1/search/rerank
export interface RerankRequest {
  query: string;
  candidates: SearchCandidate[];
  topK: number;
}

// Phase 12: POST /v1/search/summarize
export interface SummarizeRequest {
  query: string;
  candidate: SearchCandidate;
  options: SummaryOptions;
}

// Phase 13 / 14: POST /v1/search
export interface SearchOptions {
  bm25TopK: number;
  vectorTopK: number;
  rerankTopN: number;
  finalTopK: number;
  summarize: boolean;
  summaryStyle: SummaryStyle;
  summaryMaxTokens: number;
}

export interface EndToEndSearchRequest {
  query: string;
  filters: SearchFilters;
  options: SearchOptions;
}

export interface FinalSearchResult {
  rank: number;
  resumeId: string;
  name: string | null;
  role: string | null;
  company: string | null;
  totalExperience: number | null;
  skills: string[];
  sources: CandidateSource[];
  summary?: string;
}

export interface SearchTimings {
  embeddingMs: number;
  bm25Ms: number;
  vectorMs: number;
  rerankMs: number;
  summarizeMs: number;
  totalMs: number;
}

// Phase 15: warnings the doc defines for degraded responses.
export type SearchWarning = "LLM_RERANK_FAILED" | "SUMMARIZATION_FAILED";

export interface FinalSearchResponse {
  query: string;
  results: FinalSearchResult[];
  degraded: boolean;
  warnings: SearchWarning[];
  vectorFallback?: true;
  bm25Fallback?: true;
  timings: SearchTimings;
}
