import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";
import {
  IngestionStatus,
  resumeingestionRepository,
  StepTimings,
} from "../repositories/ResumeingestionRepository";
import { resumeingestionService } from "./ResumeingestionService";
import { detectDocumentType, SUPPORTED_EXTENSIONS } from "./ResumeParserService";

export const ALLOWED_BATCH_SIZES = [5, 10] as const;
export type BatchSize = (typeof ALLOWED_BATCH_SIZES)[number];

export class InvalidBatchSizeError extends Error {
  constructor() {
    super(`batchSize must be one of ${ALLOWED_BATCH_SIZES.join(", ")}`);
  }
}

export interface BatchFileResult {
  sourceFile: string;
  status: IngestionStatus;
  reason: string | null;
  resumeId: string | null;
  timings: StepTimings;
}

export interface BatchReport {
  batchId: string;
  batchSize: BatchSize;
  selected: number;
  ingested: number;
  duplicate: number;
  failed: number;
  remainingPending: number;
  durationMs: number;
  files: BatchFileResult[];
}

export interface IngestionStatusReport {
  sourceDir: string;
  totalFiles: number;
  supportedFiles: number;
  pdfFiles: number;
  wordFiles: number;
  unsupportedFiles: string[];
  ingested: number;
  duplicate: number;
  failed: number;
  pending: number;
  resumesInDb: number;
  resumesFromBatches: number;
  consistent: boolean;
  failures: { sourceFile: string; reason: string | null }[];
}

export const resolveBatchSize = (value: unknown): BatchSize => {
  const size = value === undefined || value === "" ? Number(process.env.INGESTION_BATCH_SIZE || 5) : Number(value);
  if (!ALLOWED_BATCH_SIZES.includes(size as BatchSize)) throw new InvalidBatchSizeError();
  return size as BatchSize;
};

// Runs `worker` over `items` with at most `limit` in flight, keeping result order.
const mapWithConcurrency = async <T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
};

export class BatchIngestionService {
  constructor(
    private readonly sourceDir = path.resolve(process.cwd(), process.env.RESUME_SOURCE_DIR || "resumes"),
    private readonly concurrency = Math.max(1, Number(process.env.INGESTION_CONCURRENCY) || 2),
  ) {}

  // Supported: .pdf, .docx, .doc. Everything else is only reported.
  private async listFiles(): Promise<{ supported: string[]; unsupported: string[] }> {
    const entries = await fs.promises.readdir(this.sourceDir, { withFileTypes: true });
    const names = entries
      .filter((e) => e.isFile() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
    const isSupported = (n: string) => SUPPORTED_EXTENSIONS.includes(path.extname(n).toLowerCase());
    return {
      supported: names.filter(isSupported),
      unsupported: names.filter((n) => !isSupported(n)),
    };
  }

  // New files first (in name order), then - when retrying - files that failed
  // before `retryFailedBefore`, oldest failure first so repeat offenders such
  // as scanned PDFs do not block the rest.
  private async pendingFiles(retryFailedBefore?: Date): Promise<string[]> {
    const { supported } = await this.listFiles();
    const records = new Map((await resumeingestionRepository.findFileRecords()).map((r) => [r.sourceFile, r]));
    const fresh = supported.filter((file) => !records.has(file));
    if (!retryFailedBefore) return fresh;

    const retry = [...records.values()]
      .filter((r) => r.status === "failed" && r.updatedAt < retryFailedBefore && supported.includes(r.sourceFile))
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
      .map((r) => r.sourceFile);
    return [...fresh, ...retry];
  }

  private async ingestFile(sourceFile: string, batchId: string): Promise<BatchFileResult> {
    const filePath = path.join(this.sourceDir, sourceFile);
    let result: BatchFileResult;
    let fileHash: string | null = null;

    try {
      // The content must match the extension (a renamed .txt is rejected).
      if (!(await detectDocumentType(filePath))) {
        throw new Error(path.extname(sourceFile).toLowerCase() === ".pdf" ? "Only PDF allowed" : "Unsupported file type");
      }
      const outcome = await resumeingestionService.injectResume({ filePath, fileName: sourceFile, batchId });
      fileHash = outcome.fileHash;
      result = {
        sourceFile,
        status: outcome.status,
        reason: null,
        resumeId: outcome.resumeId.toHexString(),
        timings: outcome.timings,
      };
    } catch (err) {
      const error = err as Error;
      const reason = error.cause ? `${error.message}: ${String(error.cause).slice(0, 300)}` : error.message;
      result = { sourceFile, status: "failed", reason, resumeId: null, timings: {} };
    }

    await resumeingestionRepository.saveFileRecord({
      sourceFile,
      status: result.status,
      reason: result.reason,
      fileHash,
      resumeId: result.resumeId ? new ObjectId(result.resumeId) : null,
      batchId,
      timings: result.timings,
    });
    return result;
  }

  // Ingests the next `batchSize` resumes that have not been processed yet.
  // With `retryFailedBefore`, files that failed before that time are retried too.
  async runBatch({ batchSize, retryFailedBefore }: { batchSize: BatchSize; retryFailedBefore?: Date }): Promise<BatchReport> {
    const started = Date.now();
    const batchId = `batch-${new Date().toISOString().replace(/[-:.]/g, "")}-${crypto.randomBytes(3).toString("hex")}`;
    const pending = await this.pendingFiles(retryFailedBefore);
    const selected = pending.slice(0, batchSize);

    const files = await mapWithConcurrency(selected, this.concurrency, (file) => this.ingestFile(file, batchId));
    const count = (status: IngestionStatus) => files.filter((f) => f.status === status).length;

    return {
      batchId,
      batchSize,
      selected: selected.length,
      ingested: count("ingested"),
      duplicate: count("duplicate"),
      failed: count("failed"),
      remainingPending: (await this.pendingFiles(retryFailedBefore)).length,
      durationMs: Date.now() - started,
      files,
    };
  }

  // Compares the source folder with what MongoDB holds.
  async getStatus(): Promise<IngestionStatusReport> {
    const { supported, unsupported } = await this.listFiles();
    const supportedSet = new Set(supported);
    const records = (await resumeingestionRepository.findFileRecords()).filter((r) => supportedSet.has(r.sourceFile));
    const pdfFiles = supported.filter((n) => path.extname(n).toLowerCase() === ".pdf").length;
    const byStatus = (status: IngestionStatus) => records.filter((r) => r.status === status);

    const ingested = byStatus("ingested");
    const ingestedIds = ingested.map((r) => r.resumeId).filter((id): id is ObjectId => id !== null);
    const [resumesInDb, resumesFromBatches, existing] = await Promise.all([
      resumeingestionRepository.countResumes(),
      resumeingestionRepository.countResumes({ batchId: { $ne: null } }),
      resumeingestionRepository.countExistingResumes(ingestedIds),
    ]);

    return {
      sourceDir: this.sourceDir,
      totalFiles: supported.length + unsupported.length,
      supportedFiles: supported.length,
      pdfFiles,
      wordFiles: supported.length - pdfFiles,
      unsupportedFiles: unsupported,
      ingested: ingested.length,
      duplicate: byStatus("duplicate").length,
      failed: byStatus("failed").length,
      pending: supported.length - records.length,
      resumesInDb,
      resumesFromBatches,
      // Every "ingested" record points at a stored resume, and no batch resume is unaccounted for.
      consistent:
        ingestedIds.length === ingested.length &&
        existing === ingested.length &&
        resumesFromBatches === ingested.length,
      failures: byStatus("failed").map(({ sourceFile, reason }) => ({ sourceFile, reason })),
    };
  }
}

export const batchIngestionService = new BatchIngestionService();
