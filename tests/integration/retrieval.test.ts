// Calls the real API with the real MongoDB, Mistral and Groq configured in .env.
//   npm run test:integration
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import app from "../../src/app";
import { closeDb } from "../../src/config/db";

let server: Server;
let base = "";

const post = async (path: string, body: unknown) => {
  const res = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, headers: res.headers, body: (await res.json()) as any };
};
const get = async (path: string) => {
  const res = await fetch(base + path);
  return { status: res.status, headers: res.headers, body: (await res.json()) as any };
};

const QUERY = "QA automation engineer with Selenium, Java and API testing";
let knownId = "";

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closeDb();
});

describe("retrieval API (Phase 18 integration)", () => {
  it("GET /v1/search/readiness", async () => {
    const { status, body, headers } = await get("/v1/search/readiness");
    assert.equal(status, 200);
    assert.equal(body.ready, true);
    assert.equal(body.embeddingDimension, 1024);
    assert.ok(headers.get("x-request-id"));
  });

  it("POST /v1/embeddings", async () => {
    const { status, body } = await post("/v1/embeddings", { model: "mistral-embed", input: QUERY });
    assert.equal(status, 200);
    assert.equal(body.embedding.length, 1024);
  });

  it("POST /v1/search/bm25", async () => {
    const { status, body } = await post("/v1/search/bm25", { query: "Selenium Java", topK: 5 });
    assert.equal(status, 200);
    assert.ok(body.count > 0);
    knownId = body.results[0].resumeId;
  });

  it("POST /v1/search/vector", async () => {
    const { status, body } = await post("/v1/search/vector", { query: QUERY, topK: 5 });
    assert.equal(status, 200);
    assert.ok(body.count > 0);
    assert.ok(body.results.every((r: any) => r.vectorScore > 0 && r.vectorScore <= 1));
  });

  it("POST /v1/search/hybrid", async () => {
    const { status, body } = await post("/v1/search/hybrid", { query: QUERY, topK: 5 });
    assert.equal(status, 200);
    assert.equal(body.mode, "hybrid-debug");
    assert.equal(body.degraded, false);
    assert.ok(body.bm25.length && body.vector.length);
  });

  it("POST /v1/search/rerank returns only supplied ids", async () => {
    const { status, body } = await post("/v1/search/rerank", {
      query: QUERY,
      candidates: [{ resumeId: knownId, snippet: "Automation tester with Selenium and Java" }],
      topK: 5,
    });
    assert.equal(status, 200);
    assert.deepEqual(body.results.map((r: any) => r.resumeId), [knownId]);
    assert.equal(body.results[0].rank, 1);
  });

  it("POST /v1/search/rerank rejects unknown ids", async () => {
    const { status, body } = await post("/v1/search/rerank", { query: QUERY, candidates: [{ resumeId: "000000000000000000000000", snippet: "x" }] });
    assert.equal(status, 400);
    assert.equal(body.errorCode, "INVALID_CANDIDATES");
  });

  it("POST /v1/search/summarize", async () => {
    const { status, body } = await post("/v1/search/summarize", {
      query: QUERY,
      candidate: { resumeId: knownId, snippet: "Automation tester with Selenium and Java" },
      style: "short",
      maxTokens: 150,
    });
    assert.equal(status, 200);
    assert.equal(body.resumeId, knownId);
    assert.ok(body.summary.length > 0);
  });

  it("POST /v1/search end to end with the ingested data", async () => {
    const { status, body } = await post("/v1/search", {
      query: QUERY,
      options: { rerankTopN: 10, finalTopK: 3, summarize: true },
    });
    assert.equal(status, 200);
    assert.ok(body.results.length > 0);
    assert.deepEqual(body.results.map((r: any) => r.rank), body.results.map((_: unknown, i: number) => i + 1));
    assert.ok(body.results.every((r: any) => r.sources.length > 0));
    // The doc's sample candidate is not in this dataset; a Selenium tester must be found instead.
    assert.ok(body.results.some((r: any) => r.skills.includes("Selenium")));
    if (!body.degraded) assert.ok(body.results.every((r: any) => typeof r.summary === "string"));
    for (const key of ["embeddingMs", "bm25Ms", "vectorMs", "rerankMs", "summarizeMs", "totalMs"]) {
      assert.equal(typeof body.timings[key], "number");
    }
  });

  it("POST /v1/search validation and payload limits", async () => {
    assert.equal((await post("/v1/search", { query: "" })).body.errorCode, "INVALID_SEARCH_QUERY");
    const tooLarge = await post("/v1/search", { query: "a".repeat(200_000) });
    assert.equal(tooLarge.status, 413);
    assert.equal(tooLarge.body.errorCode, "PAYLOAD_TOO_LARGE");
  });
});
