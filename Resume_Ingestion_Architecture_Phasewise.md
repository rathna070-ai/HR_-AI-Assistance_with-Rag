
# TalentLens AI — Resume Ingestion & Retrieval Architecture (Phase-wise)

> Last updated: 2026-10-07. Phases 1–16 describe the ingestion module as built (corrected where the implementation differs from the original plan). The sections after Phase 16 cover batch ingestion, the retrieval module (including AI Search: re-ranking, person-level de-duplication and summaries), and the TalentLens AI web frontend.

# Overview

The backend is a single Express server (`npm run dev`, port 3000) with two modules:

- **Ingestion**: upload a resume → extract text → parse it into structured fields → embed it → store it in MongoDB Atlas.
- **Retrieval** (`src/modules/retrieval/`): BM25, vector and hybrid search, LLM re-ranking, candidate summaries and an end-to-end search pipeline.

No separate server is created. The web frontend (`recruitbot-web/`, branded **TalentLens AI**) is a separate Vite app that calls this server.

Technology Stack:

| Layer | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express 5 |
| Database | MongoDB Atlas (`hr_app` database, `resumes` and `ingestion_files` collections) |
| Search | Atlas Vector Search (`resume_vector`), Atlas Search / BM25 (`resume_bm25`) |
| Embeddings | Mistral `mistral-embed`, 1024 dimensions |
| LLM | Groq (`openai/gpt-oss-120b` by default) for resume parsing, re-ranking and summaries, with a fallback API key |
| Text extraction | `pdf-parse`, `tesseract.js` OCR for scanned PDFs, `word-extractor` for Word files (batch ingestion) |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 3, Zustand, React Router 7 |

---

# CURRENT ARCHITECTURE

```text
                    TalentLens AI web app (recruitbot-web, Vite, port 5173)
                    ├── /           Candidate search chat
                    ├── /ingestion  Resume upload
                    └── /help       How to use / how it works
                                   │
                                   │  /v1/* and /health (Vite dev proxy; the backend sends no CORS headers)
                                   ▼
                    Express server (src/server.ts, port 3000)
                    ├── middleware: requestId → logger → routes → errorHandler
                    ├── Ingestion  (src/routes/ingestionRoutes.ts)   /v1/resume/*
                    ├── Resumes    (src/routes/resumeRoutes.ts)      /v1/resumes, /v1/resume/search
                    └── Retrieval  (src/modules/retrieval/)          /v1/search/*, /v1/search, /v1/embeddings
                                   │
          ┌────────────────────────┼─────────────────────────┐
          ▼                        ▼                         ▼
   MongoDB Atlas             Mistral API                 Groq API
   resumes, ingestion_files  mistral-embed (1024)        gpt-oss-120b
   resume_vector index                                   (primary key → fallback key on 429)
   resume_bm25 index
```

---

# PHASE 1 — Project Setup

## Goal

Prepare ingestion module structure inside existing codebase.

---

## Create Files

```text
src/
├── routes/
│   └── ingestionRoutes.ts
│
├── controllers/
│   └── ingestionController.ts
│
├── services/
│   ├── ResumeParserService.ts
│   ├── ResumeingestionService.ts
│   ├── AlgorithmResumeParser.ts
│   └── LLMResumeParser.ts
│
├── repositories/
│   └── ResumeingestionRepository.ts
│
├── config/
│   ├── multerConfig.ts
│   └── skills.ts
│
├── utils/
│   ├── regex.ts
│   └── textCleaner.ts
```

---

# Install Dependencies

```bash
npm install multer pdf-parse
```

---

# Environment Variables

Current `.env` keys (values for secrets are never committed):

```env
PORT=3000
MONGODB_URI=mongodb+srv://...
MONGODB_DB=hr_app                  # optional, default hr_app

USE_LLM_PARSER=true                # true = Groq LLM parser, false = algorithm parser

MISTRAL_API_KEY=YOUR_KEY
MISTRAL_EMBED_MODEL=mistral-embed
EMBEDDING_DIMENSION=1024

GROQ_API_KEY=YOUR_KEY
GROQ_API_KEY_FALLBACK=YOUR_KEY     # used when the primary key is rate-limited (429)
GROQ_MODEL=openai/gpt-oss-120b

VECTOR_SEARCH_INDEX=resume_vector
BM25_SEARCH_INDEX=resume_bm25
RETRIEVAL_DEFAULT_TOP_K=20
RERANK_DEFAULT_TOP_N=10

# Optional
RESUME_SOURCE_DIR=resumes          # batch ingestion source folder
INGESTION_CONCURRENCY=2
LOCAL_SEARCH_FALLBACK=true         # /v1/resume/search only
```

---

# PHASE 2 — PDF Upload API

# Goal

Upload PDF resumes securely.

---

# Create

```text
src/config/multerConfig.ts
```

---

# Requirements

- Accept only PDF
- Max file size 5MB
- Store temporarily in uploads/

---

# Upload Folder

```text
uploads/
```

---

# Endpoint

```http
POST /v1/resume/upload
```

Full URL:

```http
http://localhost:3000/v1/resume/upload
```
---

# Request Type

```text
multipart/form-data
```

---

# Route Registration

## File

```text
src/routes/ingestionRoutes.ts
```

---

# Register Route

```ts
router.post(
  "/resume/inject",
  upload.single("file"),
  ingestionController.injectResume
);
```

---

# Register In app.ts

```ts
app.use("/v1", ingestionRoutes);
```

---

# PHASE 3 — PDF Text Extraction

# Goal

Extract raw text from uploaded PDF.

---

# File

```text
src/services/ResumeParserService.ts
```

---

# Method

```ts
extractTextFromPdf(filePath)
```

---

# Flow

```text
PDF
 ↓
pdf-parse
 ↓
rawText
 ↓ (no text layer, e.g. a scanned PDF)
tesseract.js OCR  →  rawText (textSource = "ocr")
```

`extractText(filePath)` detects the real file type from its first bytes, not the extension:

| Type | Extraction | `textSource` |
|---|---|---|
| PDF | `pdf-parse`, then OCR if no text was found | `pdf` / `ocr` |
| `.docx` / `.doc` | `word-extractor` (batch ingestion only; upload endpoints accept PDF only) | `word` |
| HTML saved as `.doc` (some job portals) | HTML stripped to text | `html` |

---

```http
POST /v1/resume/extract
```

Full URL:

```http
http://localhost:3000/v1/resume/extract
```

------
# Example Output

```text
ASHWIN P
QA Engineer
Email: ashwin@gmail.com
Skills: Java Selenium Playwright
```

---

# PHASE 4 — Text Cleaning

# Goal

Normalize extracted resume text.

---

# File

```text
src/utils/textCleaner.ts
```

---

# Responsibilities

- Remove extra spaces
- Remove duplicate lines
- Normalize line breaks
- Remove special symbols

---

# Before

```text
ASHWIN P


QA Engineer
```

---

# After

```text
ASHWIN P
QA Engineer
```
-----
```http
POST /v1/resume/clean
```

Full URL:

```http
http://localhost:3000/v1/resume/clean
---

# PHASE 5 — Algorithm Resume Parser

# Goal

Convert resume text → structured JSON without LLM.

---

# File

```text
src/services/AlgorithmResumeParser.ts
```

---

# Main Method

```ts
parseResume(rawText)
```

---

# Output

```json
{
  "name": "ASHWIN P",
  "email": "ashwin@gmail.com",
  "phone": "9876543210",
  "location": "Chennai",
  "skills": [
    "Java",
    "Selenium"
  ],
  "company": "TCS",
  "role": "QA Engineer",
  "education": "B.E Computer Science",
  "totalExperience": 3.3
}
```


```http
POST /v1/resume/parse
```

Full URL:

```http
http://localhost:3000/v1/resume/parse
```

---

# PHASE 6 — Regex Utilities

No API endpoint required.

Internal utility layer only.

# File

```text
src/utils/regex.ts
```

---

# Email Regex

```ts
export const EMAIL_REGEX =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
```

---

# Phone Regex

```ts
export const PHONE_REGEX =
  /(\+91[\-\s]?)?[0]?(91)?[789]\d{9}/;
```

---

# Experience Regex

```ts
export const EXPERIENCE_REGEX =
  /(\d+(\.\d+)?)\s*(years|yrs)/i;
```

---

# PHASE 7 — Skills Detection

# Goal

Detect skills using static skill dictionary.

---

# File

```text
src/config/skills.ts
```

---

# Example Skills

```ts
export const SKILLS = [
  "Java",
  "Selenium",
  "Playwright",
  "API Testing",
  "Postman",
  "SQL",
  "MongoDB",
  "Jenkins"
];
```

---

# Detection Logic

```ts
const matchedSkills =
  SKILLS.filter(skill =>
    rawText
      .toLowerCase()
      .includes(skill.toLowerCase())
  );
```

```http
POST /v1/resume/skills
```

Full URL:

```http
http://localhost:3000/v1/resume/skills
```

---

# PHASE 8 — Optional LLM Parser

# Goal

Allow optional LLM parsing via `.env`.

---

# File

```text
src/services/LLMResumeParser.ts
```

---

Placeholder to be added in .env
# Enable

```env
USE_LLM_PARSER=true
```

```http
POST /v1/resume/llm-parse
```

Full URL:

```http
http://localhost:3000/v1/resume/llm-parse
```
---

# Disable

```env
USE_LLM_PARSER=false
```

---

# Dynamic Selection

```ts
// src/services/ResumeParserService.ts
export const getResumeParser = () =>
  isLLMParserEnabled()
    ? { parser: new LLMResumeParser(), parserType: "llm" }
    : { parser: algorithmResumeParser, parserType: "algorithm" };
```

---

# LLM Parser (as built, enabled by default)

- Groq chat completions (`GROQ_MODEL`, default `openai/gpt-oss-120b`), JSON output, temperature 0.
- `GROQ_API_KEY` is tried first; on a rate limit (429) the request is retried with `GROQ_API_KEY_FALLBACK` (`src/services/GroqClient.ts`).
- Extracted fields: `isResume`, `name`, `email`, `phone`, `location`, `skills`, `company`, `role`, `jobTitles`, `education`, `totalExperience`, `experienceSummary`.
- Documents that are not resumes (offer letters, job descriptions) are rejected with `Not a resume` (422).
- Skills are mapped to the dictionary spelling in `src/config/skills.ts`.
- `LLM_PARSER_VERSION` (currently 3) is stored with each resume, so `npm run reparse:resumes` can re-parse resumes parsed with an older prompt.

---

# PHASE 9 — Mistral Embedding Generation

# Goal

Generate embedding automatically during ingestion.

---

# Model

```text
mistral-embed
```

---

# Dimension

```text
1024
```

---

# File

```text
src/services/EmbeddingService.ts
```

---

# Embedding Input

```ts
// src/services/EmbeddingService.ts — capped at ~24k characters (mistral-embed accepts 8k tokens)
export const buildEmbeddingText = (resume, rawText) =>
  [resume.name, resume.role, resume.jobTitles?.join(", "), resume.skills.join(","),
   resume.company, resume.experienceSummary, rawText]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_INPUT_CHARS);
```

---

# Generate Embedding

```ts
const embedding =
  await embeddingService.generateEmbedding(
    embeddingText
  );
```
```http
POST /v1/resume/embed
```

Full URL:

```http
http://localhost:3000/v1/resume/embed
```
---

# PHASE 10 — MongoDB ingestion

# Goal

Store structured resume + embedding.

---

# File

```text
src/repositories/ResumeingestionRepository.ts
```

---

# Collection

```text
resumes
```

---

# Final Document

```json
{
  "fileName": "resume.pdf",

  "rawText": "Resume content",

  "name": "ASHWIN P",

  "email": "ashwin@gmail.com",

  "phone": "9876543210",

  "location": "Chennai",

  "company": "TCS",

  "role": "QA Engineer",

  "education": "B.E Computer Science",

  "totalExperience": 3.3,

  "skills": [
    "Java",
    "Selenium"
  ],

  "embedding": [],

  "embeddingModel": "mistral-embed",

  "embeddingDimension": 1024
}
```

Fields added by the implementation:

| Field | Meaning |
|---|---|
| `fileHash` | SHA-256 of the file bytes; used to skip files that were already ingested |
| `jobTitles`, `experienceSummary` | From the LLM parser |
| `parser`, `parserVersion` | `llm` or `algorithm`, and the LLM prompt version |
| `textSource` | `pdf`, `ocr`, `word` or `html` |
| `batchId` | Set when ingested by batch ingestion |
| `ingestedAt` | Insert time |

There is no separate store endpoint: documents are written only through `POST /v1/resume/inject` and batch ingestion.

---

# PHASE 11 — Resume ingestion Service

# Goal

Orchestrate complete ingestion flow.

---

# File

```text
src/services/ResumeingestionService.ts
```

---

# Full Flow

```text
PDF Upload
    ↓
Duplicate check (SHA-256 of the file) ──► already stored → 200 "Resume already ingested"
    ↓
Extract Text (OCR fallback)
    ↓
Clean Text
    ↓
Parse (LLM or algorithm parser)
    ↓
Generate Embedding
    ↓
MongoDB ingestion → 201 "Resume ingested successfully"
```

Response `data`: `{ fileName, status: "ingested" | "duplicate", resumeId, timings }`.

---

# Main Method

```ts
injectResume(file)
```


```http
POST /v1/resume/inject
```

Full URL:

```http
http://localhost:3000/v1/resume/inject

---



# PHASE 12 — Error Handling

# Cases

| Error | Message | Status |
|---|---|---|
| Invalid PDF | Only PDF allowed | 400 |
| File over 5 MB | File too large. Max size is 5MB | 400 |
| No file | No file uploaded. Send a PDF in form-data field 'file' | 400 |
| Empty Resume | Resume extraction failed | 422 |
| Not a resume (LLM parser) | Not a resume | 422 |
| LLM parsing failure | LLM resume parsing failed | 502 |
| Embedding Failure | Mistral embedding failed | 502 |
| MongoDB Failure | ingestion failed | 500 |


Applies to all endpoints.
---

# PHASE 13 — Logging

Applies to all endpoints.

# Required Logs

```json
{
  "requestId": "abc123",
  "fileName": "resume.pdf",
  "extractMs": 100,
  "parseMs": 200,
  "embeddingMs": 300,
  "mongoInsertMs": 150
}
```

---

# PHASE 14 — Vector Search Index

# Goal

Make the stored embeddings searchable with MongoDB Atlas Vector Search.

Requires an Atlas cluster (`mongodb+srv://...`). A local MongoDB does not support `$vectorSearch`.

---

# File

```text
src/repositories/ResumeRepository.ts
src/scripts/createSearchIndex.ts
```

---

# Index

Created on the `resumes` collection.

```json
{
  "name": "resume_vector",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
      { "type": "filter", "path": "skills" },
      { "type": "filter", "path": "totalExperience" }
    ]
  }
}
```

- `numDimensions` comes from `EMBEDDING_DIMENSION` and must match the stored embeddings.
- `skills` and `totalExperience` are filter fields, so searches can narrow results before ranking.

---

Placeholder to be added in .env

```env
VECTOR_SEARCH_INDEX=resume_vector
```

---

# Create Index

```bash
npm run search:index
```

The script:

- creates the index if it does not exist;
- does nothing if it already exists;
- waits until Atlas reports the index as queryable (usually under a minute), then prints its status.

Free and shared Atlas tiers allow only 3 search indexes per cluster, counted across all databases. If the limit is reached, the script fails with `The maximum number of FTS indexes has been reached`. Free a slot, upgrade the cluster, or rely on the local fallback in Phase 15.

---

# PHASE 15 — Semantic Resume Search

# Goal

Find resumes that match a free-text requirement, ranked by similarity.

> This endpoint is still available. The web app uses the retrieval module's endpoints instead (see **RETRIEVAL MODULE** below).

---

# File

```text
src/services/ResumeSearchService.ts
src/controllers/resumeController.ts
src/routes/resumeRoutes.ts
```

---

# Flow

```text
Search Query
    ↓
Mistral Embedding (same model as ingestion)
    ↓
$vectorSearch on resume_vector   (or local scoring, see below)
    ↓
Optional filters
    ↓
Ranked results with score
```

---

# Search Mode

| Mode | When | How |
|---|---|---|
| atlas | `resume_vector` is queryable | `$vectorSearch` in MongoDB |
| local | Index missing or still building | Loads matching resumes (up to 5000) and ranks them by cosine similarity in the app |

Both modes return scores on the same 0 to 1 scale. The response's `mode` field says which one ran.

```env
# false = return 503 instead of falling back to local scoring
LOCAL_SEARCH_FALLBACK=true
```

---

# Request

```http
POST /v1/resume/search
```

Full URL:

```http
http://localhost:3000/v1/resume/search
```

```json
{
  "query": "QA engineer with Selenium and API testing",
  "limit": 10,
  "filters": {
    "skills": ["Selenium", "Java"],
    "minExperience": 2,
    "maxExperience": 6,
    "location": "Chennai"
  }
}
```

| Field | Required | Rule |
|---|---|---|
| query | Yes | Non-empty text |
| limit | No | 1 to 50, default 10 |
| filters.skills | No | Resume must have **all** listed skills. Names are matched to the skills dictionary, so `selenium` becomes `Selenium`. |
| filters.minExperience | No | Years, `totalExperience >= value` |
| filters.maxExperience | No | Years, `totalExperience <= value` |
| filters.location | No | Case-insensitive match on `location` |

In atlas mode, `skills` and experience are applied inside `$vectorSearch` and `location` after ranking. In local mode all filters are applied before ranking.

---

# Response

```json
{
  "success": true,
  "message": "Search completed",
  "data": {
    "query": "QA engineer with Selenium and API testing",
    "mode": "atlas",
    "count": 1,
    "results": [
      {
        "id": "6abba26630d73b659c4f1cf8",
        "score": 0.87,
        "fileName": "resume.pdf",
        "name": "ASHWIN P",
        "email": "ashwin@gmail.com",
        "phone": "9876543210",
        "location": "Chennai",
        "company": "TCS",
        "role": "QA Engineer",
        "education": "B.E Computer Science",
        "totalExperience": 3.3,
        "skills": ["Java", "Selenium"]
      }
    ]
  }
}
```

`embedding` and `rawText` are never returned.

---

# Errors

| Case | Status | Message |
|---|---|---|
| Missing or empty query | 400 | query is required |
| Invalid limit or filters | 400 | Describes the invalid field |
| Index not ready and `LOCAL_SEARCH_FALLBACK=false` | 503 | Vector search index is not ready. Run npm run search:index |
| Embedding failure | 502 | Mistral embedding failed |
| MongoDB failure | 500 | Database operation failed |

---

# PHASE 16 — Resume Management APIs

# Goal

List, view and delete stored resumes.

---

# File

```text
src/repositories/ResumeRepository.ts
src/controllers/resumeController.ts
src/routes/resumeRoutes.ts
```

---

# List Resumes

```http
GET /v1/resumes?page=1&limit=20&skill=Java&location=Chennai
```

Full URL:

```http
http://localhost:3000/v1/resumes
```

| Query | Rule |
|---|---|
| page | Default 1 |
| limit | 1 to 100, default 20 |
| skill | Optional, exact skill from the dictionary |
| location | Optional, case-insensitive |

Newest first. Returns the same fields as search results (no `embedding`, no `rawText`).

```json
{
  "success": true,
  "message": "Resumes fetched",
  "data": { "page": 1, "limit": 20, "total": 151, "items": [] }
}
```

---

# Get Resume

```http
GET /v1/resumes/:id
```

Returns the full stored document, including `rawText`, without `embedding`.

---

# Delete Resume

```http
DELETE /v1/resumes/:id
```

- Deletes the resume document.
- Deletes the `ingestion_files` records that point to it, so the source file becomes pending again and `batch-status` stays consistent.

```json
{
  "success": true,
  "message": "Resume deleted",
  "data": { "id": "6abba26630d73b659c4f1cf8", "fileRecordsRemoved": 1 }
}
```

---

# Errors

| Case | Status | Message |
|---|---|---|
| Invalid id | 400 | Invalid resume id |
| Not found | 404 | Resume not found |
| Invalid page or limit | 400 | Describes the invalid field |
| MongoDB failure | 500 | Database operation failed |

---

# PHASE 17 — Batch Ingestion

Ingests many resumes from a folder (`RESUME_SOURCE_DIR`, default `resumes/`) in batches of 5 or 10, with `INGESTION_CONCURRENCY` files in parallel. Each file's outcome is recorded in the `ingestion_files` collection, so later runs continue with the pending files.

| Entry point | How |
|---|---|
| CLI | `npm run ingest:batch` |
| API | `POST /v1/resume/batch-inject`, `GET /v1/resume/batch-status` |

Full details: [Batch_Ingestion_Flow.md](Batch_Ingestion_Flow.md).

---

# RETRIEVAL MODULE

## Goal

Find the best candidates for a recruiter's query with keyword search, semantic search, or both, then let an LLM re-rank and summarize them.

---

## Files

```text
src/modules/retrieval/
├── routes/retrievalRoutes.ts
├── controllers/retrievalController.ts
├── services/
│   ├── SearchService.ts               BM25, vector, hybrid, end-to-end pipeline, fallbacks
│   ├── LLMService.ts                  Groq re-ranking, summaries, metadata extraction
│   └── RetrievalValidationService.ts  request validation, readiness check
├── repositories/ResumeRepository.ts   $search (BM25) and $vectorSearch queries
├── utils/
│   ├── candidateMapper.ts             MongoDB document → SearchCandidate, matched skills
│   └── deduplicate.ts                 mergeCandidates(): unique by resumeId; dedupeByPerson(): one entry per person
└── types/retrieval.types.ts
```

---

## Indexes

| Index | Type | Created by | Covers |
|---|---|---|---|
| `resume_vector` | Atlas Vector Search | `npm run search:index` | `embedding` (1024, cosine); filters `skills`, `totalExperience` |
| `resume_bm25` | Atlas Search (BM25, `lucene.standard`) | `npm run search:bm25-index` | `rawText`, `skills`, `jobTitles`, `experienceSummary`, `role`, `company` |

---

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /v1/search/readiness` | 200 when stored resumes have embeddings that match the configured model and dimension, otherwise 503 with a reason |
| `POST /v1/embeddings` | Embed a query with the same Mistral model as ingestion |
| `POST /v1/search/bm25` | Keyword search. Returns `resumeId`, `name`, `role`, `score`, `matchedSkills` |
| `POST /v1/search/vector` | Semantic search. Embeds the query, then `$vectorSearch` (`numCandidates` = max(topK × 10, 100)). Optional `exactRescore` recomputes exact cosine scores |
| `POST /v1/search/hybrid` | Runs BM25 and vector in parallel and returns **both lists side by side** (`mode: "hybrid-debug"`). Scores are not merged |
| `POST /v1/search/rerank` | LLM re-ranks supplied candidates. Returns `resumeId`, `rank`, `relevanceScore` (0–1) and a one-sentence `reason` |
| `POST /v1/search/summarize` | LLM fit summary for one candidate (`short` or `detailed`) |
| `POST /v1/search` | **End-to-end pipeline** (below) |
| `POST /v1/search/summaries` | `{ query, resumeIds }` (1–20 unique ids) → `{ query, overall, results: [{ resumeId, summary }], model }`. One LLM call for an overall shortlist summary plus a fit summary per candidate. Candidate data is loaded server-side by id; summaries for ids not in the request are dropped |

Search request body (bm25 / vector / hybrid):

```json
{ "query": "Selenium tester with 3 years", "topK": 10, "filters": { "minYearsExperience": 2 } }
```

End-to-end request body:

```json
{
  "query": "Selenium tester with 3 years",
  "filters": { "minYearsExperience": 2 },
  "options": {
    "bm25TopK": 20, "vectorTopK": 20,
    "rerankTopN": 10, "finalTopK": 5,
    "summarize": false, "summaryStyle": "short", "summaryMaxTokens": 150
  }
}
```

Limits: query ≤ 1000 characters, topK ≤ 100, `rerankTopN` ≤ 20, `finalTopK` ≤ 20 and ≤ `rerankTopN`, summary tokens 20–1000.

---

## End-to-end pipeline (`POST /v1/search`)

```text
Query (validated)
    ↓
BM25 search  ║  Mistral query embedding → vector search      (in parallel)
    ↓
Interleave the two lists (BM25[0], vector[0], BM25[1], ...)
    ↓
mergeCandidates(): deduplicate by resumeId, keep both scores and sources
    ↓
dedupeByPerson(): one entry per person (see below)
    ↓
Top rerankTopN
    ↓
LLM re-rank (Groq) — final authority on order; relevanceScore + reason kept
    ↓
Top finalTopK
    ↓
Optional per-candidate summaries (2 at a time)
    ↓
Response: results, degraded, warnings, pipeline, timings
```

The re-ranker and summarizer receive only `resumeId`, `name`, `role`, `company`, `skills` and a 600-character snippet; email and phone are used for de-duplication but never sent to the LLM. Prompts forbid gendered pronouns and judging personal traits.

### Person-level de-duplication

The same person can be stored more than once with different files (an updated CV, a one-page version); the file-hash check only catches identical bytes. `dedupeByPerson()` treats two resumes as the same person when they share a normalized email, or a phone number (last 10 digits). A name alone counts only when neither resume has an email or phone, so two different people with the same name stay separate. The best-ranked resume is kept, its scores become the best of the group, and the others are listed in `duplicates`.

### Result fields

Each result has `rank`, `resumeId`, `name`, `role`, `company`, `totalExperience`, `skills`, `sources`, plus:

| Field | Meaning |
|---|---|
| `relevanceScore`, `reason` | From the re-ranker (0–1 and one sentence); `null` when re-ranking fell back |
| `bm25Score`, `vectorScore` | Retrieval scores (`null` when not found by that search) |
| `email`, `phone`, `snippet` | For display (snippet = first 600 characters of the resume text) |
| `matchedSkills` | Skills of the resume that appear in the query |
| `duplicates` | Other stored resumes of the same person: `{ resumeId, fileName }` |
| `summary` | Only when `options.summarize` is true |

`pipeline`: `{ retrieved: { bm25, vector }, uniqueResumes, duplicatesMerged, reranked, returned }` (`reranked` is 0 when re-ranking fell back).

---

## Fallbacks

| Failure | Behaviour |
|---|---|
| Vector search or query embedding fails | BM25 results only; `degraded: true`, `vectorFallback: true` |
| BM25 fails | Vector results only; `degraded: true`, `bm25Fallback: true` |
| Both fail | 503 `SEARCH_UNAVAILABLE` |
| LLM re-ranking fails | BM25 order, then vector-only candidates (a person is placed by their best-placed resume); warning `LLM_RERANK_FAILED` |
| A summary fails | Results kept without it; warning `SUMMARIZATION_FAILED` |

---

## Errors

| Case | Status | errorCode |
|---|---|---|
| Missing or too long query | 400 | `INVALID_SEARCH_QUERY` |
| Invalid options | 400 | `INVALID_OPTIONS` |
| Unknown, repeated or too many resume ids (rerank / summarize / summaries) | 400 | `INVALID_CANDIDATES` |
| No retrieval strategy available | 503 | `SEARCH_UNAVAILABLE` |
| Embedding failure | 502 | `EMBEDDING_FAILED` |
| LLM failure (direct rerank / summarize calls) | 502 | `LLM_RERANK_FAILED`, `SUMMARIZATION_FAILED` |
| MongoDB failure | 500 | `DATABASE_ERROR` |

Error body: `{ "success": false, "errorCode": "...", "message": "..." }`. Every request is logged with its `requestId` and component timings.

---

# FRONTEND — TalentLens AI (`recruitbot-web/`)

## Stack

React 19, Vite 8, TypeScript, Tailwind CSS 3 (TalentLens AI palette, light theme), Zustand stores, React Router 7, Axios, framer-motion (LazyMotion), Radix primitives, Vitest + Testing Library.

---

## Routes

| Route | Page |
|---|---|
| `/` | Candidate search chat: sidebar (search mode — AI Search by default, Vector, BM25 Keyword, Hybrid — hybrid weights, results limit), chat thread, suggestion chips, input bar with Clear and Send, candidate profile modal |
| `/ingestion` | Resume upload: drag-and-drop PDF, client-side validation (PDF only, 5 MB), progress stages, success / already-ingested result, typed errors with retry |
| `/help` | How to use the app and how it works (linked next to the app name in the sidebar footer) |

Pages are lazy-loaded; the candidate modal is loaded on first open.

---

## How the frontend calls the backend

| UI action | Backend call |
|---|---|
| AI Search (default mode) | `POST /v1/search` with `finalTopK` = results limit, `rerankTopN` = max(results limit, 10) capped at 20, `summarize: false` (60 s timeout) |
| AI Search summaries | `POST /v1/search/summaries` with the result ids, sent once the results are on screen |
| Vector mode search | `POST /v1/search/vector` |
| BM25 Keyword mode search | `POST /v1/search/bm25` |
| Hybrid mode search | `POST /v1/search/hybrid`, then **client-side fusion** (`src/lib/utils/hybridFusion.ts`): each list min-max scaled to 0–1, combined with the sidebar weights; a resume missing from one list scores 0 for it |
| Result card details | `GET /v1/resumes/:id` per result (email, phone, experience, text snippet) |
| Candidate profile modal | `GET /v1/resumes/:id` |
| Resume upload | `POST /v1/resume/inject` (multipart field `file`, 120 s timeout) |

In development Vite proxies `/v1` and `/health` to `http://localhost:3000` because the backend sends no CORS headers. In production the API must be served from the same origin (reverse proxy), or CORS must be added to the backend.

---

## AI Search in the UI

AI Search is the default mode. Vector, BM25 Keyword and Hybrid are unchanged, for comparison.

```text
Query ──► POST /v1/search ──► results on screen ──► POST /v1/search/summaries ──► summaries fill in
```

| Part | What the user sees | Code |
|---|---|---|
| Pipeline header | "40 retrieved › 28 unique resumes › 2 duplicate resumes merged › top 10 re-ranked by AI › 5 shown", plus "Found 5 candidates · AI Search · 3.3 s" | `components/features/results/AiResultsList.tsx` |
| Shortlist summary | "AI summary" card: loading shimmer, then the overall summary; on failure the reason and **Retry summary** | `AiResultsList.tsx`, `hooks/use-shortlist-summary.ts` |
| Candidate card | Rank, name (opens the profile), role · company, relevance pill, "Keyword match" / "Semantic match" chips, experience, email, phone, **Why this match** (re-rank reason), fit summary, skills with query matches first and highlighted, "+1 more resume — Also on file: …" | `components/features/results/AiResultCard.tsx` |
| Degraded results | Amber notice when AI re-ranking, semantic search or keyword search was unavailable; cards then show the BM25 or vector score | `AiResultsList.tsx` |

Messages and states:

| State | Behaviour |
|---|---|
| Loading | "Searching resumes, removing duplicates and re-ranking with AI…" with elapsed seconds (`chat/SearchProgress.tsx`) |
| Validation | Character counter from 800 characters; over 1,000: "Query is too long (1,001 / 1,000 characters). Shorten it to search." and Send disabled (`chat/ChatInputBar.tsx`) |
| Errors | Friendly message per `errorCode` / network / timeout with **Retry search** (`lib/api/searchErrors.ts`, `chat/SearchErrorMessage.tsx`); search calls no longer show a duplicate toast |
| Empty | "No candidates found" with a hint |
| Cleared chat | A running search is abandoned and its reply dropped |

Responsive: cards, chips and the pipeline header wrap; the score drops below the name on narrow screens. Checked at 375 px with no horizontal overflow on `/`, `/ingestion` and `/help`.

Rate limits: each AI Search makes two Groq requests (re-rank, then summaries). On Groq's free tier (8,000 tokens per minute per key) a quick series of searches can hit the limit; the app then shows the "re-ranking unavailable" notice or the summary Retry instead of failing.

---

# FINAL PIPELINE

```text
INGESTION
PDF Resume (upload) / folder (batch)
    ↓
Duplicate check (SHA-256)
    ↓
Extract Text (pdf-parse, OCR fallback; Word in batch)
    ↓
Clean Text
    ↓
LLM parsing (Groq) or Regex + Algorithm parsing
    ↓
Structured JSON
    ↓
Mistral Embedding
    ↓
MongoDB ingestion (resumes)
    ↓
Atlas Vector Search index (resume_vector) + Atlas Search BM25 index (resume_bm25)

RETRIEVAL
Query
    ↓
BM25 ║ Vector  →  merge (by resume)  →  de-duplicate by person  →  LLM re-rank  →  shortlist + candidate summaries
    ↓
TalentLens AI web app: chat search, result cards, candidate profile, resume upload
```
