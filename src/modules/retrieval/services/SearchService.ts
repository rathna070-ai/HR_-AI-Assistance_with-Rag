import { ObjectId } from "mongodb";
import { embeddingService } from "../../../services/EmbeddingService";
import { resumeRepository } from "../repositories/ResumeRepository";
import {
  FinalSearchResponse,
  FinalSearchResult,
  HybridDebugFlags,
  HybridTimings,
  RerankResult,
  SearchCandidate,
  SearchFilters,
  SearchOptions,
  SearchTimings,
  SearchWarning,
} from "../types/retrieval.types";
import { matchSkills, toCandidate } from "../utils/candidateMapper";
import { dedupeByPerson, mergeCandidates } from "../utils/deduplicate";
import { llmService } from "./LLMService";

const elapsed = (start: bigint) => Number((process.hrtime.bigint() - start) / 1_000_000n);

const timed = async <T>(step: () => Promise<T>): Promise<{ value: T; ms: number }> => {
  const start = process.hrtime.bigint();
  const value = await step();
  return { value, ms: elapsed(start) };
};

// Same 0-1 scale as Atlas' cosine vectorSearchScore: (1 + cosine) / 2.
const cosineScore = (a: number[], b: number[]): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? (1 + dot / Math.sqrt(normA * normB)) / 2 : 0;
};

// Runs `worker` over `items` with at most `limit` in flight, keeping order.
const mapWithConcurrency = async <T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
};

// rank-wise BM25[0], vector[0], BM25[1], vector[1], ... so both strategies
// reach the re-ranker even when one returns many more hits.
const interleave = (a: SearchCandidate[], b: SearchCandidate[]): SearchCandidate[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => [a[i], b[i]]).flat().filter(Boolean);

export class SearchUnavailableError extends Error {
  readonly errorCode = "SEARCH_UNAVAILABLE";
  constructor() {
    super("No retrieval strategy is currently available");
  }
}

export interface VectorSearchOptions {
  exactRescore?: boolean;
  // Reuse an embedding that was already generated for this query.
  queryVector?: number[];
}

export interface HybridSearchOptions {
  bm25TopK: number;
  vectorTopK: number;
}

export interface SearchContext {
  requestId?: string;
}

interface RetrieverOutcome {
  bm25: SearchCandidate[] | null;
  vector: SearchCandidate[] | null;
  timings: HybridTimings;
}

const logFallback = (context: SearchContext, event: string, error?: unknown) =>
  console.warn(
    JSON.stringify({
      requestId: context.requestId ?? null,
      component: "SearchService",
      event,
      ...(error !== undefined && { error: (error as Error).message, detail: String((error as Error).cause ?? "").slice(0, 200) }),
    }),
  );

const toFinalResult = (candidate: SearchCandidate, rank: number, query: string, rerank?: RerankResult): FinalSearchResult => ({
  rank,
  resumeId: candidate.resumeId,
  name: candidate.name ?? null,
  role: candidate.role ?? null,
  company: candidate.company ?? null,
  totalExperience: candidate.totalExperience ?? null,
  skills: candidate.skills ?? [],
  sources: candidate.sources,
  relevanceScore: rerank?.relevanceScore ?? null,
  reason: rerank?.reason || null,
  bm25Score: candidate.bm25Score ?? null,
  vectorScore: candidate.vectorScore ?? null,
  email: candidate.email ?? null,
  phone: candidate.phone ?? null,
  snippet: candidate.snippet ?? null,
  matchedSkills: matchSkills(candidate.skills, query),
  duplicates: candidate.duplicates ?? [],
});

// Retrieval Phase 7 (bm25Search, vectorSearch), Phase 8 (hybridSearch),
// Phase 13 (endToEndSearch) and Phase 15 (fallbacks).
export class SearchService {
  async bm25Search(query: string, filters: SearchFilters, topK: number): Promise<SearchCandidate[]> {
    return (await resumeRepository.bm25Search(query, filters, topK)).map((doc) => toCandidate(doc, "bm25"));
  }

  async vectorSearch(
    query: string,
    filters: SearchFilters,
    topK: number,
    { exactRescore = false, queryVector }: VectorSearchOptions = {},
  ): Promise<SearchCandidate[]> {
    const vector = queryVector ?? (await embeddingService.generateEmbedding(query)).embedding;
    const candidates = (await resumeRepository.vectorSearch(vector, filters, topK)).map((doc) => toCandidate(doc, "vector"));
    return exactRescore ? this.exactRescore(candidates, vector) : candidates;
  }

  // ANN top K -> fetch stored vectors -> exact cosine score -> reorder top K.
  private async exactRescore(candidates: SearchCandidate[], queryVector: number[]): Promise<SearchCandidate[]> {
    if (!candidates.length) return candidates;
    const stored = await resumeRepository.findEmbeddings(candidates.map((c) => new ObjectId(c.resumeId)));
    const vectors = new Map(stored.map((doc) => [doc._id.toHexString(), doc.embedding as number[]]));

    return candidates
      .map((candidate) => {
        const vector = vectors.get(candidate.resumeId);
        return vector?.length === queryVector.length
          ? { ...candidate, vectorScore: Math.round(cosineScore(queryVector, vector) * 10_000) / 10_000 }
          : candidate;
      })
      .sort((a, b) => (b.vectorScore ?? 0) - (a.vectorScore ?? 0));
  }

  // BM25 and vector search run independently and in parallel; BM25 does not
  // wait for the query embedding. A failed strategy yields null instead of
  // failing the other (Phase 15).
  private async runRetrievers(
    query: string,
    filters: SearchFilters,
    { bm25TopK, vectorTopK }: HybridSearchOptions,
    context: SearchContext,
  ): Promise<RetrieverOutcome> {
    const timings: HybridTimings = { bm25Ms: 0, embeddingMs: 0, vectorMs: 0 };

    const bm25Run = (async () => {
      const start = process.hrtime.bigint();
      try {
        return await this.bm25Search(query, filters, bm25TopK);
      } catch (err) {
        logFallback(context, "bm25_failed", err);
        return null;
      } finally {
        timings.bm25Ms = elapsed(start);
      }
    })();

    const vectorRun = (async () => {
      let start = process.hrtime.bigint();
      try {
        const { embedding } = await embeddingService.generateEmbedding(query);
        timings.embeddingMs = elapsed(start);
        start = process.hrtime.bigint();
        const candidates = await this.vectorSearch(query, filters, vectorTopK, { queryVector: embedding });
        timings.vectorMs = elapsed(start);
        return candidates;
      } catch (err) {
        if (!timings.embeddingMs) timings.embeddingMs = elapsed(start);
        else timings.vectorMs = elapsed(start);
        logFallback(context, "vector_failed", err);
        return null;
      }
    })();

    const [bm25, vector] = await Promise.all([bm25Run, vectorRun]);
    if (!bm25 && !vector) throw new SearchUnavailableError();
    return { bm25, vector, timings };
  }

  // Phase 8: both lists side by side for debugging; scores are not merged.
  async hybridSearch(
    query: string,
    filters: SearchFilters,
    options: HybridSearchOptions,
    context: SearchContext = {},
  ): Promise<{ bm25: SearchCandidate[]; vector: SearchCandidate[]; timings: HybridTimings; flags: HybridDebugFlags }> {
    const { bm25, vector, timings } = await this.runRetrievers(query, filters, options, context);
    return {
      bm25: bm25 ?? [],
      vector: vector ?? [],
      timings,
      flags: { degraded: !bm25 || !vector, ...(!vector && { vectorFallback: true }), ...(!bm25 && { bm25Fallback: true }) },
    };
  }

  // Phase 13: validate (caller) -> embed -> BM25 + vector -> merge ->
  // deduplicate (by resume, then by person) -> top N -> LLM re-rank ->
  // optional summaries -> response.
  async endToEndSearch(
    query: string,
    filters: SearchFilters,
    options: SearchOptions,
    context: SearchContext = {},
  ): Promise<FinalSearchResponse> {
    const started = process.hrtime.bigint();
    const warnings: SearchWarning[] = [];
    const { bm25, vector, timings: retrieval } = await this.runRetrievers(
      query,
      filters,
      { bm25TopK: options.bm25TopK, vectorTopK: options.vectorTopK },
      context,
    );

    // One candidate pool, deduplicated by resumeId, with sources kept, then
    // one entry per person so the re-ranker never sees the same person twice.
    const merged = mergeCandidates(interleave(bm25 ?? [], vector ?? []));
    const pool = dedupeByPerson(merged);
    const topN = pool.slice(0, options.rerankTopN);

    // LLM re-ranking is the final authority on order. If it fails, fall back
    // to BM25 order first, then vector-only candidates.
    let ranked: SearchCandidate[];
    let rerankMs = 0;
    let rerankById = new Map<string, RerankResult>();
    try {
      const rerank = await timed(() => llmService.rerankCandidates(query, topN, options.finalTopK));
      rerankMs = rerank.ms;
      rerankById = new Map(rerank.value.results.map((r) => [r.resumeId, r]));
      const byId = new Map(topN.map((c) => [c.resumeId, c]));
      ranked = rerank.value.results.map((r) => byId.get(r.resumeId)!).filter(Boolean);
    } catch (err) {
      warnings.push("LLM_RERANK_FAILED");
      logFallback(context, "rerank_failed", err);
      // A person's position is that of their best-placed resume.
      const order = new Map(mergeCandidates(bm25 ?? [], vector ?? []).map((c, i) => [c.resumeId, i]));
      const position = (c: SearchCandidate) =>
        Math.min(...[c.resumeId, ...(c.duplicates ?? []).map((d) => d.resumeId)].map((id) => order.get(id) ?? Infinity));
      ranked = [...topN].sort((a, b) => position(a) - position(b));
    }

    const results = ranked
      .slice(0, options.finalTopK)
      .map((c, i) => toFinalResult(c, i + 1, query, rerankById.get(c.resumeId)));

    // Optional summaries; a failure keeps the ranked results without them.
    let summarizeMs = 0;
    if (options.summarize && results.length) {
      const byId = new Map(ranked.map((c) => [c.resumeId, c]));
      const summaries = await timed(() =>
        mapWithConcurrency(results, 2, async (result) => {
          try {
            return (
              await llmService.summarizeCandidateFit(query, byId.get(result.resumeId)!, {
                style: options.summaryStyle,
                maxTokens: options.summaryMaxTokens,
              })
            ).summary;
          } catch (err) {
            logFallback(context, "summarize_failed", err);
            return null;
          }
        }),
      );
      summarizeMs = summaries.ms;
      summaries.value.forEach((summary, i) => {
        if (summary) results[i].summary = summary;
      });
      if (summaries.value.some((s) => s === null)) warnings.push("SUMMARIZATION_FAILED");
    }

    const timings: SearchTimings = { ...retrieval, rerankMs, summarizeMs, totalMs: elapsed(started) };
    return {
      query,
      results,
      degraded: warnings.length > 0 || !bm25 || !vector,
      warnings,
      ...(!vector && { vectorFallback: true as const }),
      ...(!bm25 && { bm25Fallback: true as const }),
      pipeline: {
        retrieved: { bm25: bm25?.length ?? 0, vector: vector?.length ?? 0 },
        uniqueResumes: merged.length,
        duplicatesMerged: merged.length - pool.length,
        reranked: rerankById.size ? topN.length : 0,
        returned: results.length,
      },
      timings,
    };
  }
}

export const searchService = new SearchService();
