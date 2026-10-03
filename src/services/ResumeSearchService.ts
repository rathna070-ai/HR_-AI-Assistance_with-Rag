import { Document, Filter } from "mongodb";
import { resumeRepository, SUMMARY_PROJECTION, VECTOR_INDEX_NAME } from "../repositories/ResumeRepository";
import { ResumeDocument } from "../repositories/ResumeingestionRepository";
import { escapeRegex } from "../utils/regex";
import { detectSkills } from "../utils/skillDetector";
import { embeddingService } from "./EmbeddingService";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_QUERY_CHARS = 1_000;
const MAX_SKILLS = 20;
// When location is filtered after ranking, rank more resumes so enough remain.
const LOCATION_OVERFETCH = 10;
const LOCAL_SEARCH_MAX_DOCS = 5_000;

export type SearchMode = "atlas" | "local";

export class RequestValidationError extends Error {}

export class SearchIndexNotReadyError extends Error {
  constructor() {
    super("Vector search index is not ready. Run npm run search:index");
  }
}

export interface SearchFilters {
  skills?: string[];
  minExperience?: number;
  maxExperience?: number;
  location?: string;
}

export interface SearchInput {
  query: string;
  limit: number;
  filters: SearchFilters;
}

export interface SearchResult {
  id: string;
  score: number;
  [field: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionalYears = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RequestValidationError(`filters.${field} must be a non-negative number`);
  }
  return value;
};

// Maps "selenium" to the dictionary's "Selenium" so it matches stored skills.
export const canonicalSkill = (skill: string): string => {
  const detected = detectSkills(skill);
  return detected.length === 1 ? detected[0] : skill;
};

// Case-insensitive "contains" match, shared by search and list.
export const locationMatch = (location: string) => ({ $regex: escapeRegex(location), $options: "i" });

export const parseSearchInput = (body: unknown): SearchInput => {
  const input = isRecord(body) ? body : {};

  if (typeof input.query !== "string" || !input.query.trim()) {
    throw new RequestValidationError("query is required");
  }
  const query = input.query.trim();
  if (query.length > MAX_QUERY_CHARS) {
    throw new RequestValidationError(`query must be at most ${MAX_QUERY_CHARS} characters`);
  }

  const limit = input.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > MAX_LIMIT) {
    throw new RequestValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }

  if (input.filters !== undefined && !isRecord(input.filters)) {
    throw new RequestValidationError("filters must be an object");
  }
  const raw = input.filters ?? {};
  const filters: SearchFilters = {};

  if (raw.skills !== undefined) {
    if (
      !Array.isArray(raw.skills) ||
      raw.skills.length > MAX_SKILLS ||
      !raw.skills.every((s) => typeof s === "string" && s.trim())
    ) {
      throw new RequestValidationError(`filters.skills must be an array of up to ${MAX_SKILLS} skill names`);
    }
    if (raw.skills.length) filters.skills = [...new Set(raw.skills.map((s: string) => canonicalSkill(s.trim())))];
  }

  filters.minExperience = optionalYears(raw.minExperience, "minExperience");
  filters.maxExperience = optionalYears(raw.maxExperience, "maxExperience");
  if (
    filters.minExperience !== undefined &&
    filters.maxExperience !== undefined &&
    filters.minExperience > filters.maxExperience
  ) {
    throw new RequestValidationError("filters.minExperience must not be greater than filters.maxExperience");
  }

  if (raw.location !== undefined) {
    if (typeof raw.location !== "string" || !raw.location.trim()) {
      throw new RequestValidationError("filters.location must be a non-empty string");
    }
    filters.location = raw.location.trim();
  }

  return { query, limit: limit as number, filters };
};

// Pre-filter for $vectorSearch; only fields declared as "filter" in the index.
const buildVectorFilter = ({ skills, minExperience, maxExperience }: SearchFilters): Document | undefined => {
  const conditions: Document[] = (skills ?? []).map((skill) => ({ skills: { $eq: skill } }));
  if (minExperience !== undefined) conditions.push({ totalExperience: { $gte: minExperience } });
  if (maxExperience !== undefined) conditions.push({ totalExperience: { $lte: maxExperience } });
  return conditions.length ? { $and: conditions } : undefined;
};

// The same filters as a normal MongoDB query, for local scoring.
const buildQueryFilter = ({ skills, minExperience, maxExperience, location }: SearchFilters): Filter<ResumeDocument> => {
  const experience = {
    ...(minExperience !== undefined && { $gte: minExperience }),
    ...(maxExperience !== undefined && { $lte: maxExperience }),
  };
  return {
    ...(skills?.length && { skills: { $all: skills } }),
    ...(Object.keys(experience).length && { totalExperience: experience }),
    ...(location && { location: locationMatch(location) }),
  };
};

// Same scale as Atlas' cosine score: (1 + cosine) / 2, from 0 to 1.
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

const toResult = ({ _id, score, ...rest }: Document): SearchResult => ({
  id: _id.toHexString(),
  score: Math.round(score * 10_000) / 10_000,
  ...rest,
});

export class ResumeSearchService {
  private indexReady = false;

  // "atlas" when the vector index is queryable. Otherwise "local" if allowed,
  // because without a ready index Atlas returns no results instead of an error.
  private async resolveMode(): Promise<SearchMode> {
    if (this.indexReady) return "atlas";
    if ((await resumeRepository.getVectorIndexStatus()).queryable) {
      this.indexReady = true;
      return "atlas";
    }
    if (process.env.LOCAL_SEARCH_FALLBACK === "false") throw new SearchIndexNotReadyError();
    return "local";
  }

  async search(input: SearchInput): Promise<{ mode: SearchMode; results: SearchResult[] }> {
    const mode = await this.resolveMode();
    const { embedding } = await embeddingService.generateEmbedding(input.query);
    const results = mode === "atlas" ? await this.atlasSearch(input, embedding) : await this.localSearch(input, embedding);
    return { mode, results };
  }

  // Scores every matching resume in the app. Fine for a few thousand resumes.
  private async localSearch({ limit, filters }: SearchInput, queryVector: number[]): Promise<SearchResult[]> {
    const docs = await resumeRepository.findWithEmbeddings(buildQueryFilter(filters), LOCAL_SEARCH_MAX_DOCS);
    return docs
      .filter((doc) => Array.isArray(doc.embedding) && doc.embedding.length === queryVector.length)
      .map(({ embedding, ...doc }) => ({ ...doc, score: cosineScore(queryVector, embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(toResult);
  }

  private async atlasSearch({ limit, filters }: SearchInput, embedding: number[]): Promise<SearchResult[]> {
    const filter = buildVectorFilter(filters);
    const rankLimit = filters.location ? Math.min(limit * LOCATION_OVERFETCH, 500) : limit;
    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector: embedding,
          numCandidates: Math.min(Math.max(rankLimit * 10, 100), 10_000),
          limit: rankLimit,
          ...(filter && { filter }),
        },
      },
      ...(filters.location ? [{ $match: { location: locationMatch(filters.location) } }] : []),
      { $limit: limit },
      { $project: { ...SUMMARY_PROJECTION, score: { $meta: "vectorSearchScore" } } },
    ];

    return (await resumeRepository.vectorSearch(pipeline)).map(toResult);
  }
}

export const resumeSearchService = new ResumeSearchService();
