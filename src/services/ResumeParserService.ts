import fs from "fs";
import os from "os";
import path from "path";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import WordExtractor from "word-extractor";
import { ResumeParser } from "../types/resume";
import { algorithmResumeParser } from "./AlgorithmResumeParser";
import { isLLMParserEnabled, LLMResumeParser } from "./LLMResumeParser";

// Scanned resumes are OCR'd page by page; later pages rarely add anything.
const MAX_OCR_PAGES = 5;
const OCR_SCALE = 2;
const OCR_CACHE_DIR = path.join(os.tmpdir(), "hr-app-tesseract");

export type DocumentType = "pdf" | "docx" | "doc" | "html";
export type TextSource = "pdf" | "ocr" | "word" | "html";

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".doc"];

export interface ExtractedText {
  rawText: string;
  pageCount: number;
  textSource: TextSource;
}

export class ResumeExtractionError extends Error {
  constructor() {
    super("Resume extraction failed");
  }
}

// Decides the type from the file's first bytes, not just its name. Some job
// portals save resumes as HTML with a .doc extension.
export const detectDocumentType = async (filePath: string): Promise<DocumentType | null> => {
  const handle = await fs.promises.open(filePath, "r");
  let header: Buffer;
  try {
    header = Buffer.alloc(64);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    header = header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }

  const ext = path.extname(filePath).toLowerCase();
  if (header.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (ext === ".docx" && header.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return "docx";
  if (ext === ".doc" && header.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) return "doc";
  if (ext === ".doc" && header.toString("utf8").replace(/^﻿/, "").trimStart().startsWith("<")) return "html";
  return null;
};

// Some PDFs embed fonts with a broken character map: the text layer then holds
// NUL characters, which become "Mtititititi Ktitititi" after cleaning instead
// of "Mukesh Kanna". Real words almost never repeat a two-letter unit three
// times in a row ("tititi").
const GARBLED_WORD = /\b\w*(\w\w)\1{2,}\w*\b/g;
export const looksGarbled = (text: string): boolean =>
  text.includes("\u0000") || (text.match(GARBLED_WORD)?.length ?? 0) >= 2;

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

const htmlToText = (html: string): string =>
  html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

export class ResumeParserService {
  // Text layer first; PDFs without a usable one (scanned images, broken font
  // maps) fall back to OCR.
  async extractTextFromPdf(filePath: string): Promise<ExtractedText> {
    const data = await fs.promises.readFile(filePath);
    const parser = new PDFParse({ data });

    try {
      // Empty pageJoiner stops pdf-parse adding "-- 1 of 2 --" page markers.
      const result = await parser.getText({ pageJoiner: "" });
      const rawText = result.text.trim();
      if (rawText && !looksGarbled(rawText)) return { rawText, pageCount: result.total, textSource: "pdf" };

      const ocrText = await this.ocrPdf(parser);
      if (!ocrText) {
        if (rawText) return { rawText, pageCount: result.total, textSource: "pdf" };
        throw new ResumeExtractionError();
      }
      return { rawText: ocrText, pageCount: result.total, textSource: "ocr" };
    } catch (err) {
      if (err instanceof ResumeExtractionError) throw err;
      throw new ResumeExtractionError();
    } finally {
      await parser.destroy();
    }
  }

  private async ocrPdf(parser: PDFParse): Promise<string> {
    const { pages } = await parser.getScreenshot({
      scale: OCR_SCALE,
      imageBuffer: true,
      imageDataUrl: false,
      first: MAX_OCR_PAGES,
    });
    if (!pages.length) return "";

    fs.mkdirSync(OCR_CACHE_DIR, { recursive: true });
    const worker = await createWorker("eng", 1, { cachePath: OCR_CACHE_DIR });
    try {
      const texts: string[] = [];
      for (const page of pages) {
        texts.push((await worker.recognize(Buffer.from(page.data))).data.text);
      }
      return texts.join("\n").trim();
    } finally {
      await worker.terminate();
    }
  }

  // PDF, Word (.docx / .doc) or HTML saved as .doc.
  async extractText(filePath: string): Promise<ExtractedText> {
    const type = await detectDocumentType(filePath);
    if (type === "pdf") return this.extractTextFromPdf(filePath);

    let rawText = "";
    try {
      if (type === "docx" || type === "doc") {
        rawText = (await new WordExtractor().extract(filePath)).getBody().trim();
      } else if (type === "html") {
        rawText = htmlToText(await fs.promises.readFile(filePath, "utf8"));
      }
    } catch {
      throw new ResumeExtractionError();
    }
    if (!rawText) throw new ResumeExtractionError();
    return { rawText, pageCount: 1, textSource: type === "html" ? "html" : "word" };
  }
}

export const resumeParserService = new ResumeParserService();

// Phase 8 dynamic selection: USE_LLM_PARSER=true switches parsing to the LLM.
export const getResumeParser = (): { parser: ResumeParser; parserType: "llm" | "algorithm" } =>
  isLLMParserEnabled()
    ? { parser: new LLMResumeParser(), parserType: "llm" }
    : { parser: algorithmResumeParser, parserType: "algorithm" };
