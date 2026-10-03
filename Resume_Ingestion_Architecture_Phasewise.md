
# Resume Ingestion Pipeline - Complete Phase-wise Implementation Guide

# Overview

This document contains the complete implementation plan for adding a new Resume ingestion module inside an already existing backend retrieval pipeline.

Existing backend retrieval APIs are already running successfully.

ingestion should be added as a separate module folder but should run inside the same backend server using:

```bash
npm run dev
```

No separate server should be created.

Technology Stack:

- Node.js
- TypeScript
- Express
- MongoDB
- Mistral Embeddings

---

# EXISTING ARCHITECTURE

Already Available:

```text
Retrieval Pipeline
     ↓
Root Backend Server
     ↓
npm run dev
     ↓
PORT 3000
```

---

# TARGET ARCHITECTURE

```text
Retrieval Module
        +
ingestion Module
        ↓
Single Backend Server
        ↓
npm run dev
        ↓
PORT 3000
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

```env
USE_LLM_PARSER=false

MISTRAL_API_KEY=YOUR_KEY

MISTRAL_EMBED_MODEL=mistral-embed

EMBEDDING_DIMENSION=1024
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
```

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
if (process.env.USE_LLM_PARSER === "true") {
   parser = new LLMResumeParser();
} else {
   parser = new AlgorithmResumeParser();
}
```

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
const embeddingText = `
${name}
${role}
${skills.join(",")}
${company}
${rawText}
`;
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

```http
POST /v1/resume/store
```

Full URL:

```http
http://localhost:3000/v1/resume/store
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
Extract Text
    ↓
Clean Text
    ↓
Algorithm JSON Parsing
    ↓
Generate Embedding
    ↓
MongoDB ingestion
```

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

| Error | Message |
|---|---|
| Invalid PDF | Only PDF allowed |
| Empty Resume | Resume extraction failed |
| Embedding Failure | Mistral embedding failed |
| MongoDB Failure | ingestion failed |


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
  "name": "resume_vector_index",
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
VECTOR_SEARCH_INDEX=resume_vector_index
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
$vectorSearch on resume_vector_index   (or local scoring, see below)
    ↓
Optional filters
    ↓
Ranked results with score
```

---

# Search Mode

| Mode | When | How |
|---|---|---|
| atlas | `resume_vector_index` is queryable | `$vectorSearch` in MongoDB |
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

# FINAL PIPELINE

```text
PDF Resume
    ↓
Extract Text
    ↓
Regex + Algorithm Parsing
    ↓
Structured JSON
    ↓
Mistral Embedding
    ↓
MongoDB ingestion
    ↓
Atlas Vector Search Index
    ↓
Semantic Search + Resume Management APIs
```
