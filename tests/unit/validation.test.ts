import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIMITS,
  parseEndToEndSearchRequest,
  parseRerankRequest,
  parseSearchRequest,
  parseSummarizeRequest,
  RetrievalRequestError,
} from "../../src/modules/retrieval/services/RetrievalValidationService";

const rejects = (fn: () => unknown, errorCode: string) =>
  assert.throws(fn, (err: unknown) => err instanceof RetrievalRequestError && err.errorCode === errorCode);

const ID = "6abba27fa24280e1b4ab36ac";

describe("search request validation (Phase 17)", () => {
  it("requires a non-empty query and trims it", () => {
    rejects(() => parseSearchRequest({}), "INVALID_SEARCH_QUERY");
    rejects(() => parseSearchRequest({ query: "   " }), "INVALID_SEARCH_QUERY");
    assert.equal(parseSearchRequest({ query: "  tester  " }).query, "tester");
  });

  it("enforces the query length limit", () => {
    rejects(() => parseSearchRequest({ query: "a".repeat(LIMITS.maxQueryChars + 1) }), "INVALID_SEARCH_QUERY");
  });

  it("caps topK", () => {
    rejects(() => parseSearchRequest({ query: "x", topK: 0 }), "INVALID_TOP_K");
    rejects(() => parseSearchRequest({ query: "x", topK: LIMITS.maxTopK + 1 }), "INVALID_TOP_K");
    rejects(() => parseSearchRequest({ query: "x", topK: 2.5 }), "INVALID_TOP_K");
  });

  it("validates filter types", () => {
    rejects(() => parseSearchRequest({ query: "x", filters: "y" }), "INVALID_FILTERS");
    rejects(() => parseSearchRequest({ query: "x", filters: { minYearsExperience: -1 } }), "INVALID_FILTERS");
    rejects(() => parseSearchRequest({ query: "x", filters: { minYearsExperience: "5" } }), "INVALID_FILTERS");
    assert.deepEqual(parseSearchRequest({ query: "x", filters: { minYearsExperience: 5 } }).filters, { minYearsExperience: 5 });
  });
});

describe("rerank / summarize validation", () => {
  it("validates candidate ids and snippets", () => {
    rejects(() => parseRerankRequest({ query: "x", candidates: [] }), "INVALID_CANDIDATES");
    rejects(() => parseRerankRequest({ query: "x", candidates: [{ resumeId: "abc", snippet: "s" }] }), "INVALID_CANDIDATES");
    rejects(() => parseRerankRequest({ query: "x", candidates: [{ resumeId: ID, snippet: "" }] }), "INVALID_CANDIDATES");
    rejects(
      () => parseRerankRequest({ query: "x", candidates: [{ resumeId: ID, snippet: "a" }, { resumeId: ID, snippet: "b" }] }),
      "INVALID_CANDIDATES",
    );
    const tooMany = Array.from({ length: LIMITS.maxRerankCandidates + 1 }, (_, i) => ({ resumeId: i.toString(16).padStart(24, "0"), snippet: "s" }));
    rejects(() => parseRerankRequest({ query: "x", candidates: tooMany }), "INVALID_CANDIDATES");
  });

  it("caps rerank topK", () => {
    rejects(() => parseRerankRequest({ query: "x", candidates: [{ resumeId: ID, snippet: "s" }], topK: LIMITS.maxRerankTopN + 1 }), "INVALID_TOP_K");
  });

  it("validates summary style and maxTokens", () => {
    const candidate = { resumeId: ID, snippet: "s" };
    rejects(() => parseSummarizeRequest({ query: "x", candidate, style: "long" }), "INVALID_OPTIONS");
    rejects(() => parseSummarizeRequest({ query: "x", candidate, maxTokens: 5 }), "INVALID_OPTIONS");
    assert.deepEqual(parseSummarizeRequest({ query: "x", candidate }).options, { style: "short", maxTokens: 150 });
  });
});

describe("final search options", () => {
  it("applies defaults", () => {
    const { options } = parseEndToEndSearchRequest({ query: "x" });
    assert.equal(options.summarize, false);
    assert.ok(options.finalTopK <= options.rerankTopN);
  });

  it("rejects finalTopK above rerankTopN and caps rerankTopN", () => {
    rejects(() => parseEndToEndSearchRequest({ query: "x", options: { rerankTopN: 5, finalTopK: 8 } }), "INVALID_OPTIONS");
    rejects(() => parseEndToEndSearchRequest({ query: "x", options: { rerankTopN: LIMITS.maxRerankTopN + 1 } }), "INVALID_OPTIONS");
    rejects(() => parseEndToEndSearchRequest({ query: "x", options: { summarize: "yes" } }), "INVALID_OPTIONS");
  });
});
