# Prompt: Batch Resume Ingestion Workflow

## Context

You are working in the `hr-app-agent` backend (Node.js, TypeScript, Express, MongoDB, run with `npm run dev` on port 3000). The resume ingestion module already has these pieces:

| Step | Code |
|---|---|
| PDF text extraction | `resumeParserService.extractTextFromPdf()` in `src/services/ResumeParserService.ts` |
| Text cleaning | `cleanText()` in `src/utils/textCleaner.ts` |
| Structured parsing (algorithm or LLM, chosen by `USE_LLM_PARSER`) | `getResumeParser()` in `src/services/ResumeParserService.ts` |
| Mistral embedding (1024 dims) | `embeddingService.generateEmbedding()` and `buildEmbeddingText()` in `src/services/EmbeddingService.ts` |
| PDF signature check | `isPdfFile()` in `src/config/multerConfig.ts` |

The MongoDB repository (`src/repositories/ResumeingestionRepository.ts`) and the ingestion service (`src/services/ResumeingestionService.ts`) are still empty placeholders. The source resumes are in `./resumes`: about 200 files, mostly PDF, with some `.doc`/`.docx`, and some byte-identical copies such as `X.pdf` and `X (1).pdf`.

Follow the style of the existing code: small classes exported as singletons, custom `Error` subclasses with the spec's messages, and `{ success, message, data }` JSON responses.

## Goal

Build a batch ingestion workflow. Each run takes the next 5 or 10 resumes from `./resumes` that have not been processed yet and runs each one through extract, clean, parse, embed and MongoDB insert. It records the outcome of every file so that runs can be repeated, resumed and verified.

## Requirements

### 1. MongoDB layer (Phase 10)

- `src/config/db.ts`: a lazily created, shared `MongoClient` from `MONGODB_URI`, plus `getDb()` and `closeDb()`. Use the database named by `MONGODB_DB`, defaulting to `hr_app`. **Do not touch other databases on the cluster.**
- `ResumeingestionRepository` with two collections:
  - `resumes` holds the final resume document from the architecture doc (`fileName`, `rawText`, `name`, `email`, `phone`, `location`, `company`, `role`, `education`, `totalExperience`, `skills`, `embedding`, `embeddingModel`, `embeddingDimension`), plus `fileHash` (SHA-256 of the file bytes), `parser`, `batchId` and `ingestedAt`. Add a unique index on `fileHash`.
  - `ingestion_files` holds one record per source file (`sourceFile` unique), with `status` (`ingested`, `duplicate` or `failed`), `reason`, `fileHash`, `resumeId`, `batchId`, `attempts`, `timings` and `updatedAt`.
- Wrap MongoDB errors in `IngestionError("ingestion failed")`.

### 2. Single-resume ingestion (Phase 11)

- `ResumeingestionService.injectResume({ filePath, fileName, batchId? })` runs hash, extract, clean, parse, embed and insert.
- If a resume with the same `fileHash` already exists, return `status: "duplicate"` with the existing id and skip embedding. Treat a unique-index violation (code 11000) the same way.
- Measure `extractMs`, `parseMs`, `embeddingMs` and `mongoInsertMs`, and log one JSON line per file in the Phase 13 format (`requestId`, `fileName` and the timings).
- Expose `POST /v1/resume/inject` (form-data `file`), which uses the same service.

### 3. Batch workflow

- `BatchIngestionService.runBatch({ batchSize, retryFailed })`:
  - `batchSize` must be **5 or 10**; reject anything else with a clear 400 error. The default comes from `INGESTION_BATCH_SIZE` (default 5).
  - Select the next `batchSize` PDF files in `RESUME_SOURCE_DIR` (default `./resumes`, sorted by name) that have no `ingestion_files` record. Include `failed` records only if `retryFailed` is true.
  - Process files with limited concurrency from `INGESTION_CONCURRENCY` (default 2), so that one bad file never stops the batch.
  - Return a report with `batchId`, `batchSize`, `selected`, and counts of `ingested`, `duplicate` and `failed`. Include per-file results (file, status, reason, resumeId, timings), `remainingPending` and `durationMs`.
- `getStatus()` returns:
  - totals for the folder: PDFs, unsupported files (non-PDF), ingested, duplicate, failed, pending;
  - `resumesInDb` (the count of the `resumes` collection);
  - a `consistent` flag that is true when every `ingested` record points to an existing resume document and `resumesInDb` equals the ingested count.
- Endpoints:
  - `POST /v1/resume/batch-inject` with body `{ "batchSize": 5 | 10, "retryFailed": false }`
  - `GET /v1/resume/batch-status`
- CLI: `npm run ingest:batch -- --size 5|10 [--runs N | --all] [--retry-failed] [--status]`. It prints each batch report and the final status, and closes the Mongo connection.
- Never accept a folder path from the HTTP API; the source folder comes only from the environment.

### 4. Resilience

- Retry Mistral embedding calls on HTTP 429 and 5xx, up to 3 attempts with exponential backoff.
- Keep the spec's error messages: `Only PDF allowed`, `Resume extraction failed`, `Mistral embedding failed` and `ingestion failed`. Store them as the `reason` on failed files.

## Validation (must be done and reported)

1. Run `npx tsc --noEmit` and fix every error.
2. Run at least **two batches of 5 and two batches of 10** through the CLI or the API.
3. Run all remaining batches (`--all`), then run `--retry-failed` once.
4. Check `batch-status`:
   - `pending` is 0;
   - `consistent` is true;
   - `ingested + duplicate + failed` equals the number of PDFs;
   - every `failed` entry has a reason (for example, scanned PDFs with no text layer).
5. Spot-check a few stored documents: correct fields and a 1024-length embedding.
6. Re-run a batch and confirm nothing is ingested twice.
7. Report the numbers honestly. Files that cannot be ingested (scanned PDFs, `.docx`) must be listed with reasons, not hidden.
