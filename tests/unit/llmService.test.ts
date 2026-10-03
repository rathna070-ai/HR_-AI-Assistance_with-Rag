import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { groqChat } from "../../src/services/GroqClient";
import { LLMService, LLMServiceError } from "../../src/modules/retrieval/services/LLMService";
import { SearchCandidate } from "../../src/modules/retrieval/types/retrieval.types";

const reply = (content: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(status === 200 ? JSON.stringify({ choices: [{ message: { content } }] }) : content, { status, headers });

const candidates: SearchCandidate[] = [
  { resumeId: "A", sources: ["bm25"] },
  { resumeId: "B", sources: ["vector"] },
];

describe("LLM re-rank output validation (Phase 10 / 11)", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "primary-key";
    delete process.env.GROQ_API_KEY_FALLBACK;
  });
  afterEach(() => mock.restoreAll());

  it("drops invented and repeated ids, clamps scores and renumbers ranks", async () => {
    mock.method(globalThis, "fetch", async () =>
      reply(
        JSON.stringify({
          results: [
            { resumeId: "Z", relevanceScore: 0.99, reason: "invented" },
            { resumeId: "B", relevanceScore: 0.8, reason: "b" },
            { resumeId: "B", relevanceScore: 0.7, reason: "repeat" },
            { resumeId: "A", relevanceScore: 1.7, reason: "a" },
          ],
        }),
      ),
    );
    const { results } = await new LLMService("test-model").rerankCandidates("q", candidates, 10);
    assert.deepEqual(results, [
      { resumeId: "A", relevanceScore: 1, reason: "a", rank: 1 },
      { resumeId: "B", relevanceScore: 0.8, reason: "b", rank: 2 },
    ]);
  });

  for (const [label, content] of [
    ["invalid JSON", "not json"],
    ["no results array", "{}"],
    ["only invented ids", JSON.stringify({ results: [{ resumeId: "Z", relevanceScore: 1 }] })],
    ["non-numeric score", JSON.stringify({ results: [{ resumeId: "A", relevanceScore: "high" }] })],
  ]) {
    it(`fails with LLM_RERANK_FAILED on ${label}`, async () => {
      mock.method(globalThis, "fetch", async () => reply(content));
      await assert.rejects(
        new LLMService("test-model").rerankCandidates("q", candidates, 10),
        (err: unknown) => err instanceof LLMServiceError && err.errorCode === "LLM_RERANK_FAILED",
      );
    });
  }
});

describe("Groq key fallback", () => {
  afterEach(() => mock.restoreAll());
  const policy = { maxAttempts: 1, baseDelayMs: 1, maxRetryWaitMs: 10, timeoutMs: 1_000 };

  it("uses GROQ_API_KEY_FALLBACK when the primary key is rate-limited", async () => {
    process.env.GROQ_API_KEY = "primary-key";
    process.env.GROQ_API_KEY_FALLBACK = "fallback-key";
    const usedKeys: string[] = [];
    mock.method(console, "warn", () => undefined);
    mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      const key = String((init.headers as Record<string, string>).Authorization).replace("Bearer ", "");
      usedKeys.push(key);
      return key === "primary-key" ? reply("rate limited", 429, { "retry-after": "60" }) : reply("ok");
    });
    assert.equal(await groqChat({}, policy), "ok");
    assert.deepEqual(usedKeys, ["primary-key", "fallback-key"]);
  });

  it("fails when every key is rate-limited", async () => {
    process.env.GROQ_API_KEY = "primary-key";
    process.env.GROQ_API_KEY_FALLBACK = "fallback-key";
    mock.method(console, "warn", () => undefined);
    mock.method(globalThis, "fetch", async () => reply("rate limited", 429, { "retry-after": "60" }));
    await assert.rejects(groqChat({}, policy), /Groq request failed/);
  });
});
