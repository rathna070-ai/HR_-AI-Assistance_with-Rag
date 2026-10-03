import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { embeddingService } from "../../src/services/EmbeddingService";
import { llmService } from "../../src/modules/retrieval/services/LLMService";
import { searchService, SearchUnavailableError } from "../../src/modules/retrieval/services/SearchService";
import { SearchCandidate, SearchOptions } from "../../src/modules/retrieval/types/retrieval.types";

const bm25Hits: SearchCandidate[] = ["A", "B", "C"].map((id, i) => ({ resumeId: id, name: id, bm25Score: 3 - i, sources: ["bm25"] }));
const vectorHits: SearchCandidate[] = ["B", "D", "A"].map((id, i) => ({ resumeId: id, name: id, vectorScore: 0.9 - i / 10, sources: ["vector"] }));

const options: SearchOptions = {
  bm25TopK: 20,
  vectorTopK: 20,
  rerankTopN: 10,
  finalTopK: 3,
  summarize: false,
  summaryStyle: "short",
  summaryMaxTokens: 150,
};

const fail = async (): Promise<never> => {
  throw new Error("simulated failure");
};

describe("end-to-end search fallbacks (Phase 13 / 15)", () => {
  beforeEach(() => {
    mock.method(console, "warn", () => undefined);
    mock.method(embeddingService, "generateEmbedding", async () => ({ embedding: [1, 0], embeddingModel: "m", embeddingDimension: 2 }));
    mock.method(searchService, "bm25Search", async () => bm25Hits);
    mock.method(searchService, "vectorSearch", async () => vectorHits);
  });
  afterEach(() => mock.restoreAll());

  it("uses the LLM order when re-ranking works", async () => {
    mock.method(llmService, "rerankCandidates", async () => ({
      model: "m",
      results: [
        { resumeId: "D", rank: 1, relevanceScore: 0.9, reason: "" },
        { resumeId: "A", rank: 2, relevanceScore: 0.8, reason: "" },
      ],
    }));
    const response = await searchService.endToEndSearch("q", {}, options);
    assert.deepEqual(response.results.map((r) => r.resumeId), ["D", "A"]);
    assert.deepEqual(response.results.map((r) => r.rank), [1, 2]);
    assert.deepEqual(response.results[1].sources, ["bm25", "vector"]);
    assert.equal(response.degraded, false);
    assert.deepEqual(response.warnings, []);
  });

  it("falls back to BM25 order, then vector, when re-ranking fails", async () => {
    mock.method(llmService, "rerankCandidates", fail);
    const response = await searchService.endToEndSearch("q", {}, { ...options, finalTopK: 4 });
    assert.deepEqual(response.results.map((r) => r.resumeId), ["A", "B", "C", "D"]);
    assert.equal(response.degraded, true);
    assert.deepEqual(response.warnings, ["LLM_RERANK_FAILED"]);
  });

  it("uses BM25 only when vector search fails", async () => {
    mock.method(searchService, "vectorSearch", fail);
    mock.method(llmService, "rerankCandidates", async (_q: string, c: SearchCandidate[]) => ({
      model: "m",
      results: c.map((x, i) => ({ resumeId: x.resumeId, rank: i + 1, relevanceScore: 1, reason: "" })),
    }));
    const response = await searchService.endToEndSearch("q", {}, options);
    assert.equal(response.degraded, true);
    assert.equal(response.vectorFallback, true);
    assert.ok(response.results.every((r) => r.sources.includes("bm25") && !r.sources.includes("vector")));
  });

  it("uses vector only when the query embedding fails", async () => {
    mock.method(embeddingService, "generateEmbedding", fail);
    mock.method(llmService, "rerankCandidates", fail);
    const response = await searchService.endToEndSearch("q", {}, options);
    assert.equal(response.vectorFallback, true);
    assert.deepEqual(response.results.map((r) => r.resumeId), ["A", "B", "C"]);
  });

  it("uses vector only when BM25 fails", async () => {
    mock.method(searchService, "bm25Search", fail);
    mock.method(llmService, "rerankCandidates", fail);
    const response = await searchService.endToEndSearch("q", {}, options);
    assert.equal(response.bm25Fallback, true);
    assert.deepEqual(response.results.map((r) => r.resumeId), ["B", "D", "A"]);
  });

  it("returns SEARCH_UNAVAILABLE when both strategies fail", async () => {
    mock.method(searchService, "bm25Search", fail);
    mock.method(searchService, "vectorSearch", fail);
    await assert.rejects(searchService.endToEndSearch("q", {}, options), (err: unknown) => err instanceof SearchUnavailableError);
  });

  it("keeps the results without summaries when summarization fails", async () => {
    mock.method(llmService, "rerankCandidates", fail);
    mock.method(llmService, "summarizeCandidateFit", fail);
    const response = await searchService.endToEndSearch("q", {}, { ...options, summarize: true });
    assert.equal(response.results.length, 3);
    assert.ok(response.results.every((r) => r.summary === undefined));
    assert.deepEqual(response.warnings, ["LLM_RERANK_FAILED", "SUMMARIZATION_FAILED"]);
  });

  it("adds summaries when summarization works", async () => {
    mock.method(llmService, "rerankCandidates", fail);
    mock.method(llmService, "summarizeCandidateFit", async (_q: string, c: SearchCandidate) => ({ resumeId: c.resumeId, summary: `fit ${c.resumeId}` }));
    const response = await searchService.endToEndSearch("q", {}, { ...options, summarize: true });
    assert.deepEqual(response.results.map((r) => r.summary), ["fit A", "fit B", "fit C"]);
  });

  it("marks hybrid search degraded instead of failing", async () => {
    mock.method(searchService, "vectorSearch", fail);
    const { bm25, vector, flags } = await searchService.hybridSearch("q", {}, { bm25TopK: 5, vectorTopK: 5 });
    assert.equal(bm25.length, 3);
    assert.deepEqual(vector, []);
    assert.deepEqual(flags, { degraded: true, vectorFallback: true });
  });
});
