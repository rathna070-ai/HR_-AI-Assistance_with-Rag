import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { EmbeddingError, embeddingService } from "../../../services/EmbeddingService";
import { RetrievalDatabaseError, resumeRepository } from "../repositories/ResumeRepository";
import { LLMServiceError, llmService } from "../services/LLMService";
import {
  parseEmbeddingRequest,
  parseEndToEndSearchRequest,
  parseRerankRequest,
  parseSearchRequest,
  parseSummarizeRequest,
  parseVectorSearchRequest,
  RetrievalRequestError,
  retrievalValidationService,
} from "../services/RetrievalValidationService";
import { searchService, SearchUnavailableError } from "../services/SearchService";
import {
  Bm25Response,
  EmbeddingResponse,
  HybridResponse,
  RetrievalErrorBody,
  SearchCandidate,
  VectorResponse,
} from "../types/retrieval.types";
import { toBm25Result, toHybridItem, toVectorResult } from "../utils/candidateMapper";

const errorBody = (errorCode: string, message: string): RetrievalErrorBody => ({ success: false, errorCode, message });

const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof RetrievalRequestError) {
    return res.status(err.status).json(errorBody(err.errorCode, err.message));
  }
  if (err instanceof SearchUnavailableError) {
    return res.status(503).json(errorBody(err.errorCode, err.message));
  }
  if (err instanceof EmbeddingError) {
    console.error(err.message, err.cause ?? "");
    return res.status(502).json(errorBody("EMBEDDING_FAILED", err.message));
  }
  if (err instanceof LLMServiceError) {
    console.error(err.message, String(err.cause ?? "").slice(0, 300));
    return res.status(502).json(errorBody(err.errorCode, err.message));
  }
  if (err instanceof RetrievalDatabaseError) {
    console.error(err.message, err.cause ?? "");
    return res.status(500).json(errorBody("DATABASE_ERROR", err.message));
  }
  return next(err);
};

// Phase 16: the request logger reads component timings from res.locals.
const setTimings = (res: Response, timings: object) => {
  res.locals.componentTimings = timings;
};

const elapsed = (start: bigint) => Number((process.hrtime.bigint() - start) / 1_000_000n);

// Phase 17: supplied candidate ids must belong to stored resumes.
const assertCandidatesExist = async (candidates: SearchCandidate[]) => {
  const existing = new Set(await resumeRepository.findExistingIds(candidates.map((c) => new ObjectId(c.resumeId))));
  const unknown = candidates.filter((c) => !existing.has(c.resumeId)).map((c) => c.resumeId);
  if (unknown.length) throw new RetrievalRequestError("INVALID_CANDIDATES", `Unknown resumeId: ${unknown.join(", ")}`);
};

// Phase 1: GET /v1/search/readiness. 200 when ready, 503 when not.
export const getReadiness = async (_req: Request, res: Response) => {
  try {
    const report = await retrievalValidationService.checkReadiness();
    return res.status(report.ready ? 200 : 503).json(report);
  } catch (err) {
    console.error("Retrieval readiness check failed", (err as Error).message);
    return res.status(503).json({ ready: false, reason: "Database operation failed" });
  }
};

// Phase 3: POST /v1/embeddings. Embeds a search query on demand with the same
// EmbeddingService used by ingestion; no resume embedding is regenerated.
export const createEmbedding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { input } = parseEmbeddingRequest(req.body);
    const start = process.hrtime.bigint();
    const { embedding, embeddingModel, embeddingDimension } = await embeddingService.generateEmbedding(input);
    setTimings(res, { embeddingMs: elapsed(start) });
    const body: EmbeddingResponse = { embedding, model: embeddingModel, dimension: embeddingDimension };
    return res.status(200).json(body);
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Phase 5: POST /v1/search/bm25. Lexical search only; no LLM call.
export const bm25Search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, topK, filters } = parseSearchRequest(req.body);
    const start = process.hrtime.bigint();
    const results = (await searchService.bm25Search(query, filters, topK)).map((c) => toBm25Result(c, query));
    setTimings(res, { bm25Ms: elapsed(start) });
    const body: Bm25Response = { mode: "bm25", query, count: results.length, results };
    return res.status(200).json(body);
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Phase 6: POST /v1/search/vector. Embeds the query, then Atlas Vector Search.
export const vectorSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, topK, filters, exactRescore } = parseVectorSearchRequest(req.body);
    const start = process.hrtime.bigint();
    const results = (await searchService.vectorSearch(query, filters, topK, { exactRescore })).map(toVectorResult);
    setTimings(res, { vectorMs: elapsed(start) });
    const body: VectorResponse = { mode: "vector", count: results.length, results };
    return res.status(200).json(body);
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Phase 8: POST /v1/search/hybrid. Both lists side by side for debugging;
// scores are not merged. If one strategy fails its list is empty and the
// response is marked degraded (Phase 15).
export const hybridSearch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, topK, filters } = parseSearchRequest(req.body);
    const { bm25, vector, timings, flags } = await searchService.hybridSearch(
      query,
      filters,
      { bm25TopK: topK, vectorTopK: topK },
      { requestId: res.locals.requestId },
    );
    setTimings(res, timings);
    const body: HybridResponse = {
      mode: "hybrid-debug",
      bm25: bm25.map(toHybridItem),
      vector: vector.map(toHybridItem),
      ...flags,
      timings,
    };
    return res.status(200).json(body);
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Phase 11: POST /v1/search/rerank. LLM ordering of the supplied candidates.
export const rerank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, candidates, topK } = parseRerankRequest(req.body);
    await assertCandidatesExist(candidates);
    const start = process.hrtime.bigint();
    const output = await llmService.rerankCandidates(query, candidates, topK);
    setTimings(res, { rerankMs: elapsed(start) });
    return res.status(200).json(output);
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Phase 12: POST /v1/search/summarize. Candidate-fit summary grounded in the
// supplied snippet.
export const summarize = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, candidate, options } = parseSummarizeRequest(req.body);
    await assertCandidatesExist([candidate]);
    const start = process.hrtime.bigint();
    const summary = await llmService.summarizeCandidateFit(query, candidate, options);
    setTimings(res, { summarizeMs: elapsed(start) });
    return res.status(200).json(summary);
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Phase 14: POST /v1/search. The full synchronous pipeline (Phase 13) with
// fallbacks (Phase 15).
export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, filters, options } = parseEndToEndSearchRequest(req.body);
    const response = await searchService.endToEndSearch(query, filters, options, { requestId: res.locals.requestId });
    setTimings(res, response.timings);
    return res.status(200).json(response);
  } catch (err) {
    return handleError(err, res, next);
  }
};
