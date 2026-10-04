import type { ApiResponse, BackendBm25Response, BackendHybridResponse, BackendResume, BackendVectorResponse } from "@/types/api.types";
import type { SearchRequest, SearchResponse, SearchResult } from "@/types/search.types";
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
  if (params.searchType === "vector") {
    const { data } = await apiClient.post<BackendVectorResponse>("/v1/search/vector", body);
    return { endpoint: "/v1/search/vector", hits: data.results.map((r) => ({ id: r.resumeId, name: r.name, score: r.vectorScore })) };
  }
  if (params.searchType === "keyword") {
    const { data } = await apiClient.post<BackendBm25Response>("/v1/search/bm25", body);
    return { endpoint: "/v1/search/bm25", hits: data.results.map((r) => ({ id: r.resumeId, name: r.name, score: r.score })) };
  }
  const { data } = await apiClient.post<BackendHybridResponse>("/v1/search/hybrid", body);
  const toHits = (list: BackendHybridResponse["bm25"]) => list.map((r) => ({ id: r.resumeId, name: r.name, score: r.score }));
  return {
    endpoint: "/v1/search/hybrid",
    degraded: data.degraded,
    hits: fuseHybrid(toHits(data.bm25), toHits(data.vector), (params.bm25Weight ?? 0.5) * 100, (params.vectorWeight ?? 0.5) * 100, params.topK),
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
};
