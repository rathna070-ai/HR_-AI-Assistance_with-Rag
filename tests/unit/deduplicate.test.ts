import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeCandidates, MAX_SNIPPET_CHARS } from "../../src/modules/retrieval/utils/deduplicate";
import { SearchCandidate } from "../../src/modules/retrieval/types/retrieval.types";

const c = (resumeId: string, source: "bm25" | "vector", extra: Partial<SearchCandidate> = {}): SearchCandidate => ({
  resumeId,
  sources: [source],
  ...extra,
});

describe("mergeCandidates (Phase 9)", () => {
  it("merges BM25 A,B,C and vector B,D,A into A,B,C,D", () => {
    const pool = mergeCandidates([c("A", "bm25"), c("B", "bm25"), c("C", "bm25")], [c("B", "vector"), c("D", "vector"), c("A", "vector")]);
    assert.deepEqual(pool.map((p) => p.resumeId), ["A", "B", "C", "D"]);
  });

  it("keeps source provenance and both scores for repeats", () => {
    const [a] = mergeCandidates([c("A", "bm25", { bm25Score: 3 })], [c("A", "vector", { vectorScore: 0.9 })]);
    assert.deepEqual(a.sources, ["bm25", "vector"]);
    assert.equal(a.bm25Score, 3);
    assert.equal(a.vectorScore, 0.9);
  });

  it("never returns the same resume twice", () => {
    const pool = mergeCandidates([c("A", "bm25"), c("A", "bm25")], [c("A", "vector")]);
    assert.equal(pool.length, 1);
  });

  it("caps snippets before they reach the LLM", () => {
    const [a] = mergeCandidates([c("A", "bm25", { snippet: "x".repeat(5_000) })]);
    assert.ok(a.snippet!.length <= MAX_SNIPPET_CHARS + 3);
  });

  it("does not modify the input candidates", () => {
    const input = c("A", "bm25");
    mergeCandidates([input], [c("A", "vector")]);
    assert.deepEqual(input.sources, ["bm25"]);
  });
});
