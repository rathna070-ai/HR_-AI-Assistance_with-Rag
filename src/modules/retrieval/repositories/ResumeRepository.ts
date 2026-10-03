import { Document, ObjectId } from "mongodb";
import { getDb } from "../../../config/db";
import { SearchFilters } from "../types/retrieval.types";

export const BM25_INDEX_NAME = process.env.BM25_SEARCH_INDEX || "resume_bm25";
export const VECTOR_INDEX_NAME = process.env.VECTOR_SEARCH_INDEX || "resume_vector";

// Full text + skills + job titles + experience summary, plus role and company.
// jobTitles and experienceSummary are searched once ingestion stores them.
export const BM25_PATHS = ["rawText", "skills", "jobTitles", "experienceSummary", "role", "company"];

// Characters of resume text returned as a candidate snippet.
export const SNIPPET_CHARS = 600;

export class RetrievalDatabaseError extends Error {
  constructor(detail?: string) {
    super("Database operation failed");
    if (detail) this.cause = detail;
  }
}

const guard = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (err) {
    throw new RetrievalDatabaseError((err as Error).message);
  }
};

const resumes = async () => (await getDb()).collection("resumes");

// Fields every search returns; the embedding and full text are left out.
const candidateProjection = (scoreMeta: "searchScore" | "vectorSearchScore") => ({
  name: 1,
  role: 1,
  company: 1,
  skills: 1,
  totalExperience: 1,
  snippet: { $substrCP: [{ $ifNull: ["$rawText", ""] }, 0, SNIPPET_CHARS] },
  score: { $meta: scoreMeta },
});

// Retrieval Phase 4: read-only queries on the ingested `resumes` collection.
export class ResumeRepository {
  findById(id: ObjectId): Promise<Document | null> {
    return guard(async () => (await resumes()).findOne({ _id: id }, { projection: { embedding: 0 } }));
  }

  // Phase 5: Atlas Search (BM25) over the text fields, best match first.
  bm25Search(query: string, filters: SearchFilters, topK: number): Promise<Document[]> {
    const filter =
      filters.minYearsExperience !== undefined
        ? [{ range: { path: "totalExperience", gte: filters.minYearsExperience } }]
        : [];

    return guard(async () =>
      (await resumes())
        .aggregate([
          {
            $search: {
              index: BM25_INDEX_NAME,
              compound: { must: [{ text: { query, path: BM25_PATHS } }], ...(filter.length && { filter }) },
            },
          },
          { $limit: topK },
          { $project: candidateProjection("searchScore") },
        ])
        .toArray(),
    );
  }

  // Phase 6: Atlas Vector Search (approximate nearest neighbours, cosine).
  vectorSearch(queryVector: number[], filters: SearchFilters, topK: number): Promise<Document[]> {
    const filter =
      filters.minYearsExperience !== undefined ? { totalExperience: { $gte: filters.minYearsExperience } } : undefined;

    return guard(async () =>
      (await resumes())
        .aggregate([
          {
            $vectorSearch: {
              index: VECTOR_INDEX_NAME,
              path: "embedding",
              queryVector,
              numCandidates: Math.min(Math.max(topK * 10, 100), 10_000),
              limit: topK,
              ...(filter && { filter }),
            },
          },
          { $project: candidateProjection("vectorSearchScore") },
        ])
        .toArray(),
    );
  }

  // Phase 11 / 12: which of the given resume ids exist.
  findExistingIds(ids: ObjectId[]): Promise<string[]> {
    return guard(async () =>
      (await (await resumes()).find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray()).map((d) => d._id.toHexString()),
    );
  }

  // Phase 6 exact re-score: the stored vectors of the given resumes.
  findEmbeddings(ids: ObjectId[]): Promise<Document[]> {
    return guard(async () => (await resumes()).find({ _id: { $in: ids } }, { projection: { embedding: 1 } }).toArray());
  }
}

export const resumeRepository = new ResumeRepository();
