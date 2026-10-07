import { AI_SEARCH_TIMEOUT_MS } from "@/config/api.config";
import type {
  ApiResponse,
  BackendBm25Response,
  BackendFinalSearchResponse,
  BackendHybridResponse,
  BackendResume,
  BackendShortlistSummary,
  BackendVectorResponse,
} from "@/types/api.types";
import type { AiSearchResponse, SearchRequest, SearchResponse, SearchResult, ShortlistSummary } from "@/types/search.types";
import { fuseHybrid, type RankedHit } from "@/lib/utils/hybridFusion";
import apiClient from "./client";

// Adapter from the frontend doc's contract (one /search/resumes call with
// searchType vector | keyword | hybrid) to the backend that exists:
//   vector  -> POST /v1/search/vector
//   keyword -> POST /v1/search/bm25
//   hybrid  -> POST /v1/search/hybrid, blended with the weights (hybridFusion)
// The search endpoints return id, name and role only, so each result is
// completed from GET /v1/resumes/:id (email, phone, experience, text).
async function rank(params: SearchRequest): Promise<{ hits: RankedHit[]; endpoint: string; degraded?: boolean }> {
  const body = { query: params.query, topK: params.topK };
  // Errors are shown in the chat thread (with Retry), not as toasts.
  const config = { suppressErrorToast: true };
  if (params.searchType === "vector") {
    const { data } = await apiClient.post<BackendVectorResponse>("/v1/search/vector", body, config);
    return { endpoint: "/v1/search/vector", hits: data.results.map((r) => ({ id: r.resumeId, name: r.name, score: r.vectorScore })) };
  }
  if (params.searchType === "keyword") {
    const { data } = await apiClient.post<BackendBm25Response>("/v1/search/bm25", body, config);
    return { endpoint: "/v1/search/bm25", hits: data.results.map((r) => ({ id: r.resumeId, name: r.name, score: r.score })) };
  }
  const { data } = await apiClient.post<BackendHybridResponse>("/v1/search/hybrid", body, config);
  const toHits = (list: BackendHybridResponse["bm25"]) => list.map((r) => ({ id: r.resumeId, name: r.name, score: r.score }));
  return {
    endpoint: "/v1/search/hybrid",
    degraded: data.degraded,
    hits: fuseHybrid(
      toHits(data.bm25),
      toHits(data.vector),
      (params.bm25Weight ?? 0.5) * 100,
      (params.vectorWeight ?? 0.5) * 100,
      params.topK,
    ),
  };
}

async function loadResume(id: string): Promise<BackendResume | null> {
  try {
    const { data } = await apiClient.get<ApiResponse<BackendResume>>(`/v1/resumes/${id}`, { suppressErrorToast: true });
    return data.data;
  } catch {
    return null; // the result still shows with the fields search returned
  }
}

export const searchApi = {
  async searchResumes(params: SearchRequest): Promise<SearchResponse> {
    const started = performance.now();
    const { hits, endpoint, degraded } = await rank(params);
    const resumes = await Promise.all(hits.map((h) => loadResume(h.id)));

    const results: SearchResult[] = hits.map((hit, i) => {
      const resume = resumes[i];
      return {
        candidateId: hit.id,
        name: resume?.name ?? hit.name ?? "Unnamed candidate",
        email: resume?.email ?? undefined,
        phoneNumber: resume?.phone ?? undefined,
        score: hit.score,
        experienceYears: resume?.totalExperience ?? undefined,
        content: resume?.rawText ?? "",
      };
    });

    return {
      query: params.query,
      searchType: params.searchType,
      topK: params.topK,
      resultCount: results.length,
      // Round trip measured in the browser, including the profile lookups.
      duration: Math.round(performance.now() - started),
      results,
      metadata: { endpoint, ...(degraded !== undefined && { degraded }) },
    };
  },

  // AI Search: POST /v1/search. Summaries are fetched separately
  // (getShortlistSummary) so the ranked results show without waiting for them.
  async aiSearch(query: string, topK: number): Promise<AiSearchResponse> {
    const started = performance.now();
    const { data } = await apiClient.post<BackendFinalSearchResponse>(
      "/v1/search",
      // The re-ranker looks at at least 10 candidates (backend maximum 20).
      { query, options: { finalTopK: topK, rerankTopN: Math.min(20, Math.max(topK, 10)), summarize: false } },
      { timeout: AI_SEARCH_TIMEOUT_MS, suppressErrorToast: true },
    );
    return {
      query: data.query,
      results: data.results.map((r) => ({
        rank: r.rank,
        candidateId: r.resumeId,
        name: r.name ?? "Unnamed candidate",
        role: r.role,
        company: r.company,
        email: r.email,
        phone: r.phone,
        experienceYears: r.totalExperience,
        skills: r.skills,
        matchedSkills: r.matchedSkills,
        sources: r.sources,
        relevanceScore: r.relevanceScore,
        reason: r.reason,
        bm25Score: r.bm25Score,
        vectorScore: r.vectorScore,
        snippet: r.snippet,
        duplicates: r.duplicates,
      })),
      degraded: data.degraded,
      warnings: data.warnings,
      vectorFallback: !!data.vectorFallback,
      bm25Fallback: !!data.bm25Fallback,
      pipeline: data.pipeline,
      duration: Math.round(performance.now() - started),
    };
  },

  // POST /v1/search/summaries: overall summary + one fit summary per candidate.
  async getShortlistSummary(query: string, resumeIds: string[]): Promise<ShortlistSummary> {
    const { data } = await apiClient.post<BackendShortlistSummary>(
      "/v1/search/summaries",
      { query, resumeIds },
      { timeout: AI_SEARCH_TIMEOUT_MS, suppressErrorToast: true },
    );
    return { overall: data.overall, results: data.results };
  },
};
