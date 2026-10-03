import { Document, Filter, ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { IngestionFileRecord, ResumeDocument } from "./ResumeingestionRepository";

export const VECTOR_INDEX_NAME = process.env.VECTOR_SEARCH_INDEX || "resume_vector";

export class DatabaseError extends Error {
  constructor(detail?: string) {
    super("Database operation failed");
    if (detail) this.cause = detail;
  }
}

// Fields returned by list and search; the embedding and raw text are left out.
export const SUMMARY_PROJECTION = {
  _id: 1,
  fileName: 1,
  name: 1,
  email: 1,
  phone: 1,
  location: 1,
  company: 1,
  role: 1,
  education: 1,
  totalExperience: 1,
  skills: 1,
  ingestedAt: 1,
} as const;

export interface VectorIndexStatus {
  name: string;
  exists: boolean;
  status: string | null;
  queryable: boolean;
}

const guard = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (err) {
    throw new DatabaseError((err as Error).message);
  }
};

const collections = async () => {
  const db = await getDb();
  return {
    resumes: db.collection<ResumeDocument>("resumes"),
    files: db.collection<IngestionFileRecord>("ingestion_files"),
  };
};

// Phase 14: Atlas Vector Search index over the embedding, with the fields
// that searches can pre-filter on.
export const vectorIndexDefinition = (numDimensions: number) => ({
  name: VECTOR_INDEX_NAME,
  type: "vectorSearch",
  definition: {
    fields: [
      { type: "vector", path: "embedding", numDimensions, similarity: "cosine" },
      { type: "filter", path: "skills" },
      { type: "filter", path: "totalExperience" },
    ],
  },
});

export class ResumeRepository {
  getVectorIndexStatus(): Promise<VectorIndexStatus> {
    return guard(async () => {
      const { resumes } = await collections();
      const [index] = (await resumes.listSearchIndexes(VECTOR_INDEX_NAME).toArray()) as Document[];
      return {
        name: VECTOR_INDEX_NAME,
        exists: Boolean(index),
        status: index?.status ?? null,
        queryable: index?.queryable === true,
      };
    });
  }

  createVectorIndex(numDimensions: number): Promise<void> {
    return guard(async () => {
      const { resumes } = await collections();
      await resumes.createSearchIndex(vectorIndexDefinition(numDimensions));
    });
  }

  vectorSearch(pipeline: Document[]): Promise<Document[]> {
    return guard(async () => (await collections()).resumes.aggregate(pipeline).toArray());
  }

  // Matching resumes with their embeddings, for scoring in the app when the
  // Atlas index is not available.
  findWithEmbeddings(filter: Filter<ResumeDocument>, maxDocs: number) {
    return guard(async () => {
      const { resumes } = await collections();
      return resumes.find(filter, { projection: { ...SUMMARY_PROJECTION, embedding: 1 } }).limit(maxDocs).toArray();
    });
  }

  list(filter: Filter<ResumeDocument>, skip: number, limit: number) {
    return guard(async () => {
      const { resumes } = await collections();
      const [items, total] = await Promise.all([
        resumes.find(filter, { projection: SUMMARY_PROJECTION }).sort({ ingestedAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
        resumes.countDocuments(filter),
      ]);
      return { items, total };
    });
  }

  findById(id: ObjectId) {
    return guard(async () => (await collections()).resumes.findOne({ _id: id }, { projection: { embedding: 0 } }));
  }

  // Removes the resume and the ingestion records that point at it, so its
  // source file counts as pending again and batch status stays consistent.
  deleteById(id: ObjectId): Promise<{ deleted: boolean; fileRecordsRemoved: number }> {
    return guard(async () => {
      const { resumes, files } = await collections();
      const { deletedCount } = await resumes.deleteOne({ _id: id });
      if (!deletedCount) return { deleted: false, fileRecordsRemoved: 0 };
      const { deletedCount: fileRecordsRemoved } = await files.deleteMany({ resumeId: id });
      return { deleted: true, fileRecordsRemoved };
    });
  }
}

export const resumeRepository = new ResumeRepository();
