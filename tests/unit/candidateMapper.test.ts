import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";
import {
  matchSkills,
  toBm25Result,
  toCandidate,
  toHybridItem,
  toVectorResult,
} from "../../src/modules/retrieval/utils/candidateMapper";

const id = new ObjectId("6abba27fa24280e1b4ab36ac");

describe("candidate mapping (Phase 7)", () => {
  it("normalizes a BM25 hit", () => {
    const candidate = toCandidate(
      { _id: id, name: "Mukesh Kanna", role: "QA", company: "Mphasis", skills: ["Java"], totalExperience: 5.6, snippet: "a\n\n b", score: 6.0913 },
      "bm25",
    );
    assert.deepEqual(candidate, {
      resumeId: id.toHexString(),
      name: "Mukesh Kanna",
      role: "QA",
      company: "Mphasis",
      skills: ["Java"],
      totalExperience: 5.6,
      snippet: "a b",
      bm25Score: 6.09,
      sources: ["bm25"],
    });
  });

  it("normalizes a vector hit and leaves missing fields out", () => {
    const candidate = toCandidate({ _id: id, name: null, skills: null, score: 0.812345 }, "vector");
    assert.equal(candidate.vectorScore, 0.8123);
    assert.equal(candidate.name, undefined);
    assert.deepEqual(candidate.skills, []);
    assert.equal(candidate.totalExperience, null);
    assert.deepEqual(candidate.sources, ["vector"]);
  });

  it("maps candidates to the endpoint shapes", () => {
    const candidate = toCandidate({ _id: id, name: "A", role: "R", skills: ["Java", "Selenium"], score: 2 }, "bm25");
    assert.deepEqual(toBm25Result(candidate, "selenium tester"), {
      resumeId: id.toHexString(),
      name: "A",
      role: "R",
      score: 2,
      matchedSkills: ["Selenium"],
    });
    assert.deepEqual(toVectorResult({ ...candidate, vectorScore: 0.9 }), { resumeId: id.toHexString(), name: "A", role: "R", vectorScore: 0.9 });
    assert.deepEqual(toHybridItem(candidate), { resumeId: id.toHexString(), name: "A", score: 2 });
  });
});

describe("matchSkills", () => {
  it("matches whole words only", () => {
    assert.deepEqual(matchSkills(["Java", "JavaScript"], "javascript developer"), ["JavaScript"]);
  });

  it("ignores the part in brackets", () => {
    assert.deepEqual(matchSkills(["MCP (Model Context Protocol)"], "RAG and MCP"), ["MCP (Model Context Protocol)"]);
  });
});
