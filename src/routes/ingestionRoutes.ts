import { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import multer from "multer";
import { InvalidFileTypeError, isPdfFile, upload } from "../config/multerConfig";
import * as ingestionController from "../controllers/ingestionController";

const router = Router();

// Runs multer for a single "file" field and turns upload errors into 400 responses.
const uploadSinglePdf = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, async (err: unknown) => {
    if (!err) {
      if (req.file && !(await isPdfFile(req.file.path))) {
        await fs.promises.unlink(req.file.path).catch(() => undefined);
        return res.status(400).json({ success: false, message: "Only PDF allowed" });
      }
      return next();
    }

    if (err instanceof InvalidFileTypeError) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large. Max size is 5MB"
          : err.code === "LIMIT_UNEXPECTED_FILE"
            ? "Unexpected field. Send the PDF in form-data field 'file'"
            : err.message;
      return res.status(400).json({ success: false, message });
    }

    return next(err);
  });
};

router.post("/resume/upload", uploadSinglePdf, ingestionController.uploadResume);
router.post("/resume/extract", uploadSinglePdf, ingestionController.extractResume);
router.post("/resume/clean", uploadSinglePdf, ingestionController.cleanResume);
router.post("/resume/parse", uploadSinglePdf, ingestionController.parseResume);
router.post("/resume/skills", uploadSinglePdf, ingestionController.detectResumeSkills);
router.post("/resume/llm-parse", uploadSinglePdf, ingestionController.llmParseResume);
router.post("/resume/embed", uploadSinglePdf, ingestionController.embedResume);
router.post("/resume/inject", uploadSinglePdf, ingestionController.injectResume);
router.post("/resume/batch-inject", ingestionController.batchInjectResumes);
router.get("/resume/batch-status", ingestionController.batchIngestionStatus);

export default router;
