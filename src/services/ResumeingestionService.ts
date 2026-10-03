import crypto from "crypto";
import fs from "fs";
import { ObjectId } from "mongodb";
import {
  DuplicateResumeError,
  resumeingestionRepository,
  StepTimings,
} from "../repositories/ResumeingestionRepository";
import { cleanText } from "../utils/textCleaner";
import { buildEmbeddingText, embeddingService } from "./EmbeddingService";
import { LLM_PARSER_VERSION } from "./LLMResumeParser";
import { getResumeParser, resumeParserService } from "./ResumeParserService";

export interface InjectResumeInput {
  filePath: string;
  fileName: string;
  batchId?: string;
}

export interface InjectResumeResult {
  status: "ingested" | "duplicate";
  resumeId: ObjectId;
  fileHash: string;
  timings: StepTimings;
}

const elapsed = (start: bigint) => Number((process.hrtime.bigint() - start) / 1_000_000n);

// Runs one step and records how long it took under `key`.
const timed = async <T>(timings: StepTimings, key: keyof StepTimings, step: () => Promise<T>): Promise<T> => {
  const start = process.hrtime.bigint();
  try {
    return await step();
  } finally {
    timings[key] = elapsed(start);
  }
};

export class ResumeingestionService {
  // PDF / Word -> extract (OCR for scanned PDFs) -> clean -> parse -> embed -> MongoDB. Files whose bytes are
  // already stored come back as "duplicate" without calling Mistral again.
  async injectResume({ filePath, fileName, batchId }: InjectResumeInput): Promise<InjectResumeResult> {
    const requestId = crypto.randomUUID();
    const timings: StepTimings = {};

    try {
      const fileHash = crypto.createHash("sha256").update(await fs.promises.readFile(filePath)).digest("hex");
      const existingId = await resumeingestionRepository.findResumeIdByHash(fileHash);
      if (existingId) {
        return { status: "duplicate", resumeId: existingId, fileHash, timings };
      }

      const { rawText, textSource } = await timed(timings, "extractMs", () => resumeParserService.extractText(filePath));
      const cleanedText = cleanText(rawText);

      const { parser, parserType } = getResumeParser();
      const resume = await timed(timings, "parseMs", () => parser.parseResume(cleanedText));

      const { embedding, embeddingModel, embeddingDimension } = await timed(timings, "embeddingMs", () =>
        embeddingService.generateEmbedding(buildEmbeddingText(resume, cleanedText)),
      );

      try {
        const resumeId = await timed(timings, "mongoInsertMs", () =>
          resumeingestionRepository.insertResume({
            fileName,
            fileHash,
            rawText: cleanedText,
            ...resume,
            parser: parserType,
            parserVersion: parserType === "llm" ? LLM_PARSER_VERSION : null,
            textSource,
            embedding,
            embeddingModel,
            embeddingDimension,
            batchId: batchId ?? null,
            ingestedAt: new Date(),
          }),
        );
        return { status: "ingested", resumeId, fileHash, timings };
      } catch (err) {
        if (!(err instanceof DuplicateResumeError)) throw err;
        const resumeId = await resumeingestionRepository.findResumeIdByHash(fileHash);
        if (!resumeId) throw err;
        return { status: "duplicate", resumeId, fileHash, timings };
      }
    } finally {
      // Phase 13 log line.
      console.log(JSON.stringify({ requestId, fileName, ...timings }));
    }
  }
}

export const resumeingestionService = new ResumeingestionService();
