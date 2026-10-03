// Re-parses stored resumes with the LLM parser and regenerates their embeddings.
// Updates documents in place, so resume ids stay the same. Resumable: resumes
// already parsed by the current LLM prompt version are skipped. A backup of the collection is written
// to backups/ first.
//
//   npm run reparse:resumes                     all resumes not parsed by the current prompt version
//   npm run reparse:resumes -- --limit 5        only the first 5
//   npm run reparse:resumes -- --file "a.pdf"   only this file (repeatable)
//   add --force to include resumes already on the current version
//
// Resumes whose stored text is garbled (broken PDF font maps) are re-extracted
// from the source file in RESUME_SOURCE_DIR, which OCRs them.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { BSON } from "mongodb";
import { closeDb, getDb } from "../config/db";
import { buildEmbeddingText, embeddingService } from "../services/EmbeddingService";
import { LLM_PARSER_VERSION, LLMParseError, LLMResumeParser, NotAResumeError } from "../services/LLMResumeParser";
import { looksGarbled, resumeParserService } from "../services/ResumeParserService";
import { cleanText } from "../utils/textCleaner";

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const sourceDir = path.resolve(process.cwd(), process.env.RESUME_SOURCE_DIR || "resumes");
const files = args.flatMap((arg, i) => (arg === "--file" && args[i + 1] ? [args[i + 1]] : []));

const main = async () => {
  const db = await getDb();
  const resumes = db.collection("resumes");
  const fileRecords = db.collection("ingestion_files");

  const backupDir = path.resolve(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `resumes-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(backupFile, BSON.EJSON.stringify(await resumes.find().toArray(), { relaxed: false }));
  console.log(`Backed up the resumes collection to ${backupFile}`);

  const filter = {
    ...(!args.includes("--force") && { parserVersion: { $ne: LLM_PARSER_VERSION } }),
    ...(files.length && { fileName: { $in: files } }),
  };
  const limit = Number(option("--limit")) || 0;
  const todo = await resumes.find(filter, { projection: { rawText: 1, fileName: 1, textSource: 1 } }).limit(limit).toArray();
  console.log(`${todo.length} resume(s) to re-parse`);

  const parser = new LLMResumeParser();
  const counts = { updated: 0, notResume: 0, failed: 0 };
  for (const [i, doc] of todo.entries()) {
    const label = `[${i + 1}/${todo.length}] ${doc.fileName}`;
    try {
      let rawText: string = doc.rawText;
      let textSource: string = doc.textSource ?? "pdf";
      if (looksGarbled(rawText)) {
        const extracted = await resumeParserService.extractText(path.join(sourceDir, doc.fileName));
        rawText = cleanText(extracted.rawText);
        textSource = extracted.textSource;
        console.log(`${label}: garbled text layer, re-extracted (${textSource})`);
      }
      const parsed = await parser.parseResume(rawText);
      const { embedding, embeddingModel, embeddingDimension } = await embeddingService.generateEmbedding(
        buildEmbeddingText(parsed, rawText),
      );
      await resumes.updateOne(
        { _id: doc._id },
        {
          $set: {
            ...parsed,
            rawText,
            parser: "llm",
            parserVersion: LLM_PARSER_VERSION,
            textSource,
            embedding,
            embeddingModel,
            embeddingDimension,
            reparsedAt: new Date(),
          },
        },
      );
      counts.updated++;
      console.log(`${label} -> ${parsed.name} | ${parsed.role} | ${parsed.totalExperience} yrs | ${parsed.jobTitles.length} titles`);
    } catch (err) {
      if (err instanceof NotAResumeError) {
        // Not a resume (offer letter, ID card, ...): remove it from search and
        // mark its source files as failed, so batch status stays consistent.
        await resumes.deleteOne({ _id: doc._id });
        await fileRecords.updateMany(
          { resumeId: doc._id },
          { $set: { status: "failed", reason: "Not a resume", resumeId: null, updatedAt: new Date() } },
        );
        counts.notResume++;
        console.log(`${label} -> removed: not a resume`);
        continue;
      }
      counts.failed++;
      const detail = String((err as Error).cause ?? (err as Error).message);
      console.log(`${label} -> FAILED: ${(err as Error).message}: ${detail.slice(0, 200)}`);
      if (err instanceof LLMParseError && detail.includes("429")) {
        console.log("Groq rate limit reached. Run this command again later to continue.");
        break;
      }
    }
  }

  console.log(`\nDone: ${counts.updated} updated, ${counts.notResume} removed (not a resume), ${counts.failed} failed`);
  console.log(`Remaining to re-parse: ${await resumes.countDocuments({ parserVersion: { $ne: LLM_PARSER_VERSION } })}`);
};

main()
  .catch((err) => {
    console.error((err as Error).message, (err as Error).cause ?? "");
    process.exitCode = 1;
  })
  .finally(closeDb);
