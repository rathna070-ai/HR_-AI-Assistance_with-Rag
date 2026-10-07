import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dedupeByPerson, mergeCandidates, MAX_SNIPPET_CHARS } from "../../src/modules/retrieval/utils/deduplicate";
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

describe("dedupeByPerson", () => {
  it("keeps the first resume of a person matched by email and lists the others", () => {
    const pool = dedupeByPerson([
      c("A", "bm25", { email: "Arun@Mail.com ", fileName: "arun.pdf", bm25Score: 5 }),
      c("B", "bm25", { email: "x@mail.com" }),
      c("C", "vector", { email: "arun@mail.com", fileName: "arun (1).pdf", vectorScore: 0.8 }),
    ]);
    assert.deepEqual(pool.map((p) => p.resumeId), ["A", "B"]);
    assert.deepEqual(pool[0].duplicates, [{ resumeId: "C", fileName: "arun (1).pdf" }]);
    assert.deepEqual(pool[0].sources, ["bm25", "vector"]);
    assert.equal(pool[0].bm25Score, 5);
    assert.equal(pool[0].vectorScore, 0.8);
  });

  it("matches by phone on the last 10 digits", () => {
    const pool = dedupeByPerson([c("A", "bm25", { phone: "+91 98765 43210" }), c("B", "vector", { phone: "9876543210" })]);
    assert.deepEqual(pool.map((p) => p.resumeId), ["A"]);
  });

  it("keeps different people who share a name but not contact details", () => {
    const pool = dedupeByPerson([
      c("A", "bm25", { name: "Deepika", email: "d1@mail.com" }),
      c("B", "bm25", { name: "Deepika", email: "d2@mail.com" }),
    ]);
    assert.equal(pool.length, 2);
  });

  it("matches on name only when neither resume has contact details", () => {
    const pool = dedupeByPerson([c("A", "bm25", { name: "Arun Raj S.M" }), c("B", "vector", { name: "arun raj s m" }), c("C", "vector", { name: "Arun Raj S.M", email: "a@mail.com" })]);
    assert.deepEqual(pool.map((p) => p.resumeId), ["A", "C"]);
    assert.deepEqual(pool[0].duplicates, [{ resumeId: "B", fileName: null }]);
  });

  it("follows a chain of identifiers (email on one pair, phone on the next)", () => {
    const pool = dedupeByPerson([
      c("A", "bm25", { email: "p@mail.com" }),
      c("B", "bm25", { email: "p@mail.com", phone: "9000000001" }),
      c("C", "vector", { phone: "9000000001" }),
    ]);
    assert.deepEqual(pool.map((p) => p.resumeId), ["A"]);
    assert.deepEqual(pool[0].duplicates!.map((d) => d.resumeId), ["B", "C"]);
  });

  it("does not modify the input candidates", () => {
    const input = c("A", "bm25", { email: "p@mail.com" });
    dedupeByPerson([input, c("B", "vector", { email: "p@mail.com" })]);
    assert.deepEqual(input.sources, ["bm25"]);
    assert.equal(input.duplicates, undefined);
  });
});
