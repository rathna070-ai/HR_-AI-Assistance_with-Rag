import { Filter, MongoServerError, ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { ParsedResume } from "../types/resume";

export class IngestionError extends Error {
  constructor(detail?: string) {
    super("ingestion failed");
    if (detail) this.cause = detail;
  }
}

export class DuplicateResumeError extends Error {
  constructor() {
    super("Resume already ingested");
  }
}

export interface ResumeDocument extends ParsedResume {
  _id?: ObjectId;
  fileName: string;
  fileHash: string;
  rawText: string;
  parser: "algorithm" | "llm";
  parserVersion?: number | null;
  textSource?: "pdf" | "ocr" | "word" | "html";
  embedding: number[];
  embeddingModel: string;
  embeddingDimension: number;
  batchId: string | null;
  ingestedAt: Date;
}

export type IngestionStatus = "ingested" | "duplicate" | "failed";

export interface StepTimings {
  extractMs?: number;
  parseMs?: number;
  embeddingMs?: number;
  mongoInsertMs?: number;
}

export interface IngestionFileRecord {
  sourceFile: string;
  status: IngestionStatus;
  reason: string | null;
  fileHash: string | null;
  resumeId: ObjectId | null;
  batchId: string | null;
  attempts: number;
  timings: StepTimings;
  updatedAt: Date;
}

// Runs a Mongo call and reports any driver failure as "ingestion failed".
const guard = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof IngestionError || err instanceof DuplicateResumeError) throw err;
    throw new IngestionError((err as Error).message);
  }
};

export class ResumeingestionRepository {
  private indexesReady: Promise<void> | undefined;

  private async collections() {
    const db = await getDb();
    const resumes = db.collection<ResumeDocument>("resumes");
    const files = db.collection<IngestionFileRecord>("ingestion_files");
    this.indexesReady ??= Promise.all([
      resumes.createIndex({ fileHash: 1 }, { unique: true }),
      files.createIndex({ sourceFile: 1 }, { unique: true }),
      files.createIndex({ status: 1 }),
    ]).then(() => undefined);
    await this.indexesReady;
    return { resumes, files };
  }

  findResumeIdByHash(fileHash: string): Promise<ObjectId | null> {
    return guard(async () => {
      const { resumes } = await this.collections();
      const doc = await resumes.findOne({ fileHash }, { projection: { _id: 1 } });
      return doc?._id ?? null;
    });
  }

  insertResume(doc: ResumeDocument): Promise<ObjectId> {
    return guard(async () => {
      const { resumes } = await this.collections();
      try {
        const { insertedId } = await resumes.insertOne(doc);
        return insertedId;
      } catch (err) {
        // Two copies of the same file processed at the same time.
        if (err instanceof MongoServerError && err.code === 11000) throw new DuplicateResumeError();
        throw err;
      }
    });
  }

  saveFileRecord(record: Omit<IngestionFileRecord, "attempts" | "updatedAt">): Promise<void> {
    return guard(async () => {
      const { files } = await this.collections();
      await files.updateOne(
        { sourceFile: record.sourceFile },
        { $set: { ...record, updatedAt: new Date() }, $inc: { attempts: 1 } },
        { upsert: true },
      );
    });
  }

  findFileRecords(): Promise<IngestionFileRecord[]> {
    return guard(async () => {
      const { files } = await this.collections();
      return files.find({}, { projection: { _id: 0 } }).toArray();
    });
  }

  countResumes(filter: Filter<ResumeDocument> = {}): Promise<number> {
    return guard(async () => (await this.collections()).resumes.countDocuments(filter));
  }

  countExistingResumes(ids: ObjectId[]): Promise<number> {
    return guard(async () => (await this.collections()).resumes.countDocuments({ _id: { $in: ids } }));
  }
}

export const resumeingestionRepository = new ResumeingestionRepository();
