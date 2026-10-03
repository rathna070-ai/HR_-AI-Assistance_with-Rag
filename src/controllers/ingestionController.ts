import fs from "fs";
import { NextFunction, Request, Response } from "express";
import { IngestionError } from "../repositories/ResumeingestionRepository";
import { batchIngestionService, InvalidBatchSizeError, resolveBatchSize } from "../services/BatchIngestionService";
import { buildEmbeddingText, EmbeddingError, embeddingService } from "../services/EmbeddingService";
import { isLLMParserEnabled, LLMParseError, LLMResumeParser, NotAResumeError } from "../services/LLMResumeParser";
import { getResumeParser, ResumeExtractionError, resumeParserService } from "../services/ResumeParserService";
import { resumeingestionService } from "../services/ResumeingestionService";
import { cleanText } from "../utils/textCleaner";
import { detectSkills } from "../utils/skillDetector";

const NO_FILE_MESSAGE = "No file uploaded. Send a PDF in form-data field 'file'";
const NO_INPUT_MESSAGE = "Send a PDF in form-data field 'file' or JSON body { \"rawText\": \"...\" }";

interface ResumeText {
  fileName?: string;
  rawText: string;
  cleanedText: string;
}

// Maps known pipeline errors to HTTP responses; anything else goes to Express.
const handleError = (err: unknown, res: Response, next: NextFunction) => {
  if (err instanceof ResumeExtractionError || err instanceof NotAResumeError) {
    return res.status(422).json({ success: false, message: err.message });
  }
  if (err instanceof LLMParseError || err instanceof EmbeddingError) {
    console.error(err.message, err.cause ?? "");
    return res.status(502).json({ success: false, message: err.message });
  }
  if (err instanceof IngestionError) {
    console.error(err.message, err.cause ?? "");
    return res.status(500).json({ success: false, message: err.message });
  }
  if (err instanceof InvalidBatchSizeError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
};

// Wraps a handler that works on resume text. The text comes from an uploaded
// PDF (form-data "file") or JSON { "rawText": "..." }, and is cleaned first.
const withResumeText =
  (handler: (input: ResumeText, req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let rawText: string;
      if (req.file) {
        ({ rawText } = await resumeParserService.extractTextFromPdf(req.file.path));
      } else if (typeof req.body?.rawText === "string" && req.body.rawText.trim()) {
        rawText = req.body.rawText;
      } else {
        return res.status(400).json({ success: false, message: NO_INPUT_MESSAGE });
      }

      await handler({ fileName: req.file?.originalname, rawText, cleanedText: cleanText(rawText) }, req, res);
    } catch (err) {
      handleError(err, res, next);
    } finally {
      // The uploaded PDF is only needed while the request runs.
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => undefined);
    }
  };

export const uploadResume = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: NO_FILE_MESSAGE,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Resume uploaded successfully",
    data: {
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
    },
  });
};

export const extractResume = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: NO_FILE_MESSAGE });
  }

  try {
    const { rawText, pageCount } = await resumeParserService.extractTextFromPdf(req.file.path);

    return res.status(200).json({
      success: true,
      message: "Resume text extracted successfully",
      data: {
        fileName: req.file.originalname,
        pageCount,
        characterCount: rawText.length,
        rawText,
      },
    });
  } catch (err) {
    return handleError(err, res, next);
  } finally {
    // The uploaded PDF is only needed for extraction.
    await fs.promises.unlink(req.file.path).catch(() => undefined);
  }
};

export const cleanResume = withResumeText(async ({ fileName, rawText, cleanedText }, _req, res) =>
  res.status(200).json({
    success: true,
    message: "Resume text cleaned successfully",
    data: {
      ...(fileName && { fileName }),
      originalCharacterCount: rawText.length,
      cleanedCharacterCount: cleanedText.length,
      cleanedText,
    },
  }),
);

export const parseResume = withResumeText(async ({ fileName, cleanedText }, _req, res) => {
  const { parser, parserType } = getResumeParser();
  const resume = await parser.parseResume(cleanedText);

  return res.status(200).json({
    success: true,
    message: "Resume parsed successfully",
    data: { ...(fileName && { fileName }), parser: parserType, ...resume },
  });
});

export const detectResumeSkills = withResumeText(async ({ fileName, cleanedText }, _req, res) => {
  const skills = detectSkills(cleanedText);

  return res.status(200).json({
    success: true,
    message: "Skills detected successfully",
    data: { ...(fileName && { fileName }), skillCount: skills.length, skills },
  });
});

export const llmParseResume = withResumeText(async ({ fileName, cleanedText }, _req, res) => {
  if (!isLLMParserEnabled()) {
    return res.status(400).json({
      success: false,
      message: "LLM parser is disabled. Set USE_LLM_PARSER=true in .env and restart the server",
    });
  }

  const resume = await new LLMResumeParser().parseResume(cleanedText);

  return res.status(200).json({
    success: true,
    message: "Resume parsed with LLM successfully",
    data: { ...(fileName && { fileName }), parser: "llm", ...resume },
  });
});

export const embedResume = withResumeText(async ({ fileName, cleanedText }, _req, res) => {
  const { parser, parserType } = getResumeParser();
  const resume = await parser.parseResume(cleanedText);
  const { embedding, embeddingModel, embeddingDimension } = await embeddingService.generateEmbedding(
    buildEmbeddingText(resume, cleanedText),
  );

  return res.status(200).json({
    success: true,
    message: "Resume embedding generated successfully",
    data: {
      ...(fileName && { fileName }),
      parser: parserType,
      ...resume,
      embeddingModel,
      embeddingDimension,
      embedding,
    },
  });
});

export const injectResume = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: NO_FILE_MESSAGE });
  }

  try {
    const { status, resumeId, timings } = await resumeingestionService.injectResume({
      filePath: req.file.path,
      fileName: req.file.originalname,
    });

    return res.status(status === "ingested" ? 201 : 200).json({
      success: true,
      message: status === "ingested" ? "Resume ingested successfully" : "Resume already ingested",
      data: { fileName: req.file.originalname, status, resumeId, timings },
    });
  } catch (err) {
    return handleError(err, res, next);
  } finally {
    await fs.promises.unlink(req.file.path).catch(() => undefined);
  }
};

// Body: { "batchSize": 5 | 10, "retryFailed": false }. The source folder comes
// from RESUME_SOURCE_DIR only, never from the request.
export const batchInjectResumes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchSize = resolveBatchSize(req.body?.batchSize);
    const report = await batchIngestionService.runBatch({
      batchSize,
      retryFailedBefore: req.body?.retryFailed === true ? new Date() : undefined,
    });

    return res.status(200).json({
      success: true,
      message: report.selected ? `Batch processed: ${report.selected} file(s)` : "No pending resumes to ingest",
      data: report,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

export const batchIngestionStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({ success: true, message: "Batch ingestion status", data: await batchIngestionService.getStatus() });
  } catch (err) {
    return handleError(err, res, next);
  }
};
