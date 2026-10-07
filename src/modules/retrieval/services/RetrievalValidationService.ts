import { getDb } from "../../../config/db";
import {
  EmbeddingRequest,
  EndToEndSearchRequest,
  RerankRequest,
  SearchCandidate,
  SearchFilters,
  SearchRequest,
  ShortlistSummaryRequest,
  SummarizeRequest,
  SummaryOptions,
  SummaryStyle,
  VectorSearchRequest,
} from "../types/retrieval.types";

const COLLECTION = "resumes";
const NO_EMBEDDINGS_REASON = "No ingested resume embeddings are available";

// A rejected request: HTTP status plus the errorCode returned to the client.
export class RetrievalRequestError extends Error {
  constructor(
    readonly errorCode: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Phase 17 limits. They keep synchronous requests, LLM prompts and responses small.
export const LIMITS = {
  maxQueryChars: 1_000,
  maxEmbeddingInputChars: 8_000,
  maxTopK: 100,
  maxRerankTopN: 20,
  maxFinalTopK: 20,
  maxRerankCandidates: 50,
  maxSnippetChars: 2_000,
  minSummaryTokens: 20,
  maxSummaryTokens: 1_000,
};

const SUMMARY_STYLES: SummaryStyle[] = ["short", "detailed"];
const OBJECT_ID = /^[0-9a-f]{24}$/i;

const fail = (errorCode: string, message: string): never => {
  throw new RetrievalRequestError(errorCode, message);
};

const parseQuery = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return fail("INVALID_SEARCH_QUERY", "Search query is required");
  const query = value.trim();
  if (query.length > LIMITS.maxQueryChars) {
    fail("INVALID_SEARCH_QUERY", `Search query must be at most ${LIMITS.maxQueryChars} characters`);
  }
  return query;
};

// An optional integer between 1 and max; undefined gives the fallback.
const intOption = (value: unknown, name: string, fallback: number, max: number, errorCode = "INVALID_OPTIONS"): number => {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > max) {
    return fail(errorCode, `${name} must be an integer between 1 and ${max}`);
  }
  return value;
};

const boolOption = (value: unknown, name: string, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") return fail("INVALID_OPTIONS", `${name} must be true or false`);
  return value;
};

const parseFilters = (value: unknown): SearchFilters => {
  if (value === undefined) return {};
  if (!isRecord(value)) return fail("INVALID_FILTERS", "filters must be an object");
  const filters: SearchFilters = {};
  const minYears = value.minYearsExperience;
  if (minYears !== undefined) {
    if (typeof minYears !== "number" || !Number.isFinite(minYears) || minYears < 0) {
      return fail("INVALID_FILTERS", "filters.minYearsExperience must be a non-negative number");
    }
    filters.minYearsExperience = minYears;
  }
  return filters;
};

// Candidate ids must look like resume ids; whether they exist is checked by the controller.
const parseCandidate = (value: unknown, label: string): SearchCandidate => {
  if (!isRecord(value)) return fail("INVALID_CANDIDATES", `${label} must be an object`);
  const { resumeId, snippet } = value;
  if (typeof resumeId !== "string" || !OBJECT_ID.test(resumeId)) {
    return fail("INVALID_CANDIDATES", `${label}.resumeId must be a 24-character resume id`);
  }
  if (typeof snippet !== "string" || !snippet.trim()) return fail("INVALID_CANDIDATES", `${label}.snippet is required`);
  if (snippet.length > LIMITS.maxSnippetChars) {
    fail("INVALID_CANDIDATES", `${label}.snippet must be at most ${LIMITS.maxSnippetChars} characters`);
  }
  return { resumeId: resumeId.toLowerCase(), snippet: snippet.trim(), sources: [] };
};

const parseSummaryOptions = (style: unknown, maxTokens: unknown, styleName = "style", tokensName = "maxTokens"): SummaryOptions => {
  if (style !== undefined && !SUMMARY_STYLES.includes(style as SummaryStyle)) {
    fail("INVALID_OPTIONS", `${styleName} must be "short" or "detailed"`);
  }
  if (
    maxTokens !== undefined &&
    (typeof maxTokens !== "number" ||
      !Number.isInteger(maxTokens) ||
      maxTokens < LIMITS.minSummaryTokens ||
      maxTokens > LIMITS.maxSummaryTokens)
  ) {
    fail("INVALID_OPTIONS", `${tokensName} must be an integer between ${LIMITS.minSummaryTokens} and ${LIMITS.maxSummaryTokens}`);
  }
  return { style: (style as SummaryStyle | undefined) ?? "short", maxTokens: (maxTokens as number | undefined) ?? 150 };
};

// Phase 3: { "model": "mistral-embed", "input": "..." }. model is optional.
export const parseEmbeddingRequest = (body: unknown): EmbeddingRequest => {
  const input = isRecord(body) ? body : {};
  const configuredModel = process.env.MISTRAL_EMBED_MODEL || "mistral-embed";

  if (typeof input.input !== "string" || !input.input.trim()) return fail("INVALID_EMBEDDING_INPUT", "input is required");
  if (input.input.length > LIMITS.maxEmbeddingInputChars) {
    fail("INVALID_EMBEDDING_INPUT", `input must be at most ${LIMITS.maxEmbeddingInputChars} characters`);
  }
  if (input.model !== undefined && input.model !== configuredModel) {
    fail("UNSUPPORTED_EMBEDDING_MODEL", `Only ${configuredModel} is supported`);
  }
  return { model: configuredModel, input: input.input.trim() };
};

// Phase 5 / 8: { "query": "...", "topK": 20, "filters": { "minYearsExperience": 10 } }
export const parseSearchRequest = (body: unknown): SearchRequest => {
  const input = isRecord(body) ? body : {};
  return {
    query: parseQuery(input.query),
    topK: intOption(input.topK, "topK", Number(process.env.RETRIEVAL_DEFAULT_TOP_K) || 20, LIMITS.maxTopK, "INVALID_TOP_K"),
    filters: parseFilters(input.filters),
  };
};

// Phase 6: the search request plus optional "exactRescore": true.
export const parseVectorSearchRequest = (body: unknown): VectorSearchRequest => ({
  ...parseSearchRequest(body),
  exactRescore: boolOption(isRecord(body) ? body.exactRescore : undefined, "exactRescore", false),
});

// Phase 11: { "query", "candidates": [{ "resumeId", "snippet" }], "topK" }
export const parseRerankRequest = (body: unknown): RerankRequest => {
  const input = isRecord(body) ? body : {};
  const query = parseQuery(input.query);
  if (!Array.isArray(input.candidates) || !input.candidates.length) {
    return fail("INVALID_CANDIDATES", "candidates must be a non-empty array");
  }
  if (input.candidates.length > LIMITS.maxRerankCandidates) {
    fail("INVALID_CANDIDATES", `At most ${LIMITS.maxRerankCandidates} candidates can be re-ranked`);
  }
  const candidates = input.candidates.map((c, i) => parseCandidate(c, `candidates[${i}]`));
  if (new Set(candidates.map((c) => c.resumeId)).size !== candidates.length) {
    fail("INVALID_CANDIDATES", "candidates must not repeat a resumeId");
  }
  const defaultTopK = Number(process.env.RERANK_DEFAULT_TOP_N) || 10;
  return { query, candidates, topK: intOption(input.topK, "topK", defaultTopK, LIMITS.maxRerankTopN, "INVALID_TOP_K") };
};

// Phase 12: { "query", "candidate": { "resumeId", "snippet" }, "style", "maxTokens" }
export const parseSummarizeRequest = (body: unknown): SummarizeRequest => {
  const input = isRecord(body) ? body : {};
  return {
    query: parseQuery(input.query),
    candidate: parseCandidate(input.candidate, "candidate"),
    options: parseSummaryOptions(input.style, input.maxTokens),
  };
};

// POST /v1/search/summaries: { "query", "resumeIds": ["..."] }, at most
// maxFinalTopK ids (the size of a result list).
export const parseShortlistSummaryRequest = (body: unknown): ShortlistSummaryRequest => {
  const input = isRecord(body) ? body : {};
  const query = parseQuery(input.query);
  if (!Array.isArray(input.resumeIds) || !input.resumeIds.length) {
    return fail("INVALID_CANDIDATES", "resumeIds must be a non-empty array");
  }
  if (input.resumeIds.length > LIMITS.maxFinalTopK) fail("INVALID_CANDIDATES", `At most ${LIMITS.maxFinalTopK} resumeIds can be summarized`);
  const resumeIds = input.resumeIds.map((id, i) => {
    if (typeof id !== "string" || !OBJECT_ID.test(id)) return fail("INVALID_CANDIDATES", `resumeIds[${i}] must be a 24-character resume id`);
    return id.toLowerCase();
  });
  if (new Set(resumeIds).size !== resumeIds.length) fail("INVALID_CANDIDATES", "resumeIds must not repeat an id");
  return { query, resumeIds };
};

// Phase 14: { "query", "filters", "options": { bm25TopK, vectorTopK, rerankTopN,
// finalTopK, summarize, summaryStyle, summaryMaxTokens } }
export const parseEndToEndSearchRequest = (body: unknown): EndToEndSearchRequest => {
  const input = isRecord(body) ? body : {};
  const query = parseQuery(input.query);
  const filters = parseFilters(input.filters);
  if (input.options !== undefined && !isRecord(input.options)) return fail("INVALID_OPTIONS", "options must be an object");
  const o: Record<string, unknown> = isRecord(input.options) ? input.options : {};

  const defaultTopK = Number(process.env.RETRIEVAL_DEFAULT_TOP_K) || 20;
  const rerankTopN = intOption(o.rerankTopN, "options.rerankTopN", Number(process.env.RERANK_DEFAULT_TOP_N) || 10, LIMITS.maxRerankTopN);
  const finalTopK = intOption(o.finalTopK, "options.finalTopK", Math.min(5, rerankTopN), LIMITS.maxFinalTopK);
  if (finalTopK > rerankTopN) fail("INVALID_OPTIONS", "options.finalTopK must not be greater than options.rerankTopN");
  const summary = parseSummaryOptions(o.summaryStyle, o.summaryMaxTokens, "options.summaryStyle", "options.summaryMaxTokens");

  return {
    query,
    filters,
    options: {
      bm25TopK: intOption(o.bm25TopK, "options.bm25TopK", defaultTopK, LIMITS.maxTopK),
      vectorTopK: intOption(o.vectorTopK, "options.vectorTopK", defaultTopK, LIMITS.maxTopK),
      rerankTopN,
      finalTopK,
      summarize: boolOption(o.summarize, "options.summarize", false),
      summaryStyle: summary.style,
      summaryMaxTokens: summary.maxTokens,
    },
  };
};

export type ReadinessReport =
  | {
      ready: true;
      collection: string;
      resumeCount: number;
      resumesWithEmbedding: number;
      embeddingModel: string;
      embeddingDimension: number;
    }
  | { ready: false; reason: string };

// Retrieval Phase 1: retrieval is only ready when ingestion has stored resumes
// whose embeddings match the model and dimension used for query embeddings.
export class RetrievalValidationService {
  async checkReadiness(): Promise<ReadinessReport> {
    const embeddingModel = process.env.MISTRAL_EMBED_MODEL || "mistral-embed";
    const embeddingDimension = Number(process.env.EMBEDDING_DIMENSION) || 1024;
    // Same shared client as ingestion (src/config/db.ts).
    const resumes = (await getDb()).collection(COLLECTION);

    const resumeCount = await resumes.countDocuments();
    if (!resumeCount) return { ready: false, reason: NO_EMBEDDINGS_REASON };

    const withEmbedding = { "embedding.0": { $exists: true } };
    const resumesWithEmbedding = await resumes.countDocuments(withEmbedding);
    if (!resumesWithEmbedding) return { ready: false, reason: NO_EMBEDDINGS_REASON };

    const mismatched = await resumes.countDocuments({
      ...withEmbedding,
      $or: [
        { embeddingModel: { $ne: embeddingModel } },
        { $expr: { $ne: [{ $size: "$embedding" }, embeddingDimension] } },
      ],
    });
    if (mismatched) {
      return {
        ready: false,
        reason: `${mismatched} stored embedding(s) do not match ${embeddingModel} with ${embeddingDimension} dimensions`,
      };
    }

    return { ready: true, collection: COLLECTION, resumeCount, resumesWithEmbedding, embeddingModel, embeddingDimension };
  }
}

export const retrievalValidationService = new RetrievalValidationService();
