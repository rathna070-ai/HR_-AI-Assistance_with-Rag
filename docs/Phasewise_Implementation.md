# TalentLens AI — Phase-wise Implementation

**Resume ingestion, RAG retrieval and AI candidate search**

| | |
|---|---|
| Repository | <https://github.com/rathna070-ai/HR_-AI-Assistance_with-Rag> (private) |
| Date | 7 October 2026 |
| Backend | Node.js, TypeScript, Express 5 — one server, port 3000 |
| Database | MongoDB Atlas (`hr_app`): `resumes`, `ingestion_files`; indexes `resume_vector` (vector) and `resume_bm25` (Atlas Search) |
| AI services | Mistral `mistral-embed` (1024-dim embeddings); Groq `openai/gpt-oss-120b` (parsing, re-ranking, summaries) with a fallback API key |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 3, Zustand, React Router 7 — port 5173 |
| Tests | Backend `node:test` (48 unit tests), frontend Vitest (56 tests), Playwright browser scenarios, Postman / Newman collections |

## Contents

1. Architecture
2. Implementation timeline
3. Part A — Ingestion pipeline (Phases 1–16 and batch ingestion)
4. Part B — Retrieval pipeline (Phases 1–19)
5. Part C — Web frontend (Phases 1–15)
6. Part D — Rebrand and UX (TalentLens AI)
7. Part E — AI Search enhancements
8. API reference
9. Verification summary

---

## 1. Architecture

```text
TalentLens AI web app (recruitbot-web, Vite, port 5173)
  /           candidate search chat (AI Search, Vector, BM25, Hybrid)
  /ingestion  resume upload
  /help       how to use / how it works
        │  /v1/* and /health through the Vite dev proxy
        ▼
Express server (src/server.ts, port 3000)
  middleware: requestId → logger → routes → errorHandler
  Ingestion   src/routes/ingestionRoutes.ts         /v1/resume/*
  Resumes     src/routes/resumeRoutes.ts            /v1/resumes, /v1/resume/search
  Retrieval   src/modules/retrieval/                /v1/search*, /v1/embeddings
        │
        ├── MongoDB Atlas   resumes, ingestion_files, resume_vector, resume_bm25
        ├── Mistral API     mistral-embed (1024)
        └── Groq API        gpt-oss-120b (primary key → fallback key on 429)
```

**End-to-end flow**

```text
INGESTION   PDF upload / resume folder (batch)
            → duplicate check (SHA-256 of the file)
            → text extraction (pdf-parse, OCR fallback; Word in batch)
            → cleaning → LLM parsing (or algorithm parser)
            → Mistral embedding → MongoDB (resumes)

RETRIEVAL   query → BM25 ║ vector (parallel)
            → merge (by resume) → de-duplicate by person
            → LLM re-rank (score + reason) → top K
            → shortlist + per-candidate summaries

UI          AI Search results with pipeline counts, reasons, summaries,
            candidate profile; Vector / BM25 / Hybrid for comparison
```

---

## 2. Implementation timeline

| Date | Stage | Outcome |
|---|---|---|
| 27 Sep 2026 | Ingestion Phases 1–4 | Upload API, PDF text extraction, text cleaning, each verified in Postman before the next phase |
| 29 Sep 2026 | Ingestion Phases 5–13, batch ingestion | Parsers, skills, LLM parser, embeddings, MongoDB storage, orchestration, errors, logging; batch ingestion of the resume folder in batches of 5 or 10 |
| 1 Oct 2026 | Ingestion Phases 14–16 | Vector index, semantic search, resume management APIs |
| 3 Oct 2026 | Retrieval Phases 1–18 | BM25, vector, hybrid, LLM re-ranking, summaries, end-to-end pipeline, fallbacks, validation, tests; Postman collections; first push to GitHub (commit `8b61901`) |
| 4 Oct 2026 | Frontend Phases 1–15 | React app for ingestion and retrieval, one commit per phase (`d509ae1` … `3e73892`) |
| 4 Oct 2026 | Rebrand and UX | TalentLens AI name, logo and palette; in-app guide; Clear next to Send; larger mode badge (`e1ee54e`) |
| 7 Oct 2026 | AI Search enhancements | Re-ranking details, person-level de-duplication, shortlist summaries, end-to-end UI, messages, responsive design (`fc0e8a2`) |

---

## 3. Part A — Ingestion pipeline

Guide: `Resume_Ingestion_Architecture_Phasewise.md`. Verification: `postman/HR-Ingestion.postman_collection.json` (one folder per phase).

| Phase | Goal | Implementation | Endpoint / files |
|---|---|---|---|
| 1. Project setup | Ingestion module inside the existing server | Routes, controller, services, repository, config and utils folders; `npm run dev` runs one server on port 3000 | `src/routes`, `src/controllers`, `src/services`, `src/repositories` |
| 2. PDF upload API | Accept resumes securely | Multer, PDF only (MIME + extension + content check), max 5 MB, stored in `uploads/` | `POST /v1/resume/upload`, `src/config/multerConfig.ts` |
| 3. PDF text extraction | Raw text from the PDF | `pdf-parse`; OCR with `tesseract.js` when a PDF has no text layer (scanned) | `POST /v1/resume/extract`, `ResumeParserService.ts` |
| 4. Text cleaning | Normalised text | Extra spaces, duplicate lines, line breaks and broken ligature characters fixed | `POST /v1/resume/clean`, `src/utils/textCleaner.ts` |
| 5. Algorithm parser | Structured JSON without an LLM | Name, email, phone, location, skills, company, role, education, total experience | `POST /v1/resume/parse`, `AlgorithmResumeParser.ts` |
| 6. Regex utilities | Shared patterns | Email, phone and experience regexes | `src/utils/regex.ts` |
| 7. Skills detection | Skills from a dictionary | Whole-word matching against `src/config/skills.ts`, canonical spelling | `POST /v1/resume/skills` |
| 8. LLM parser | Better parsing via `.env` switch | Groq LLM parser (`USE_LLM_PARSER=true`, now the default): adds job titles and an experience summary, rejects non-resumes ("Not a resume"), prompt versioned for re-parsing | `POST /v1/resume/llm-parse`, `LLMResumeParser.ts` |
| 9. Mistral embedding | Vector for each resume | `mistral-embed`, 1024 dimensions; input = name, role, job titles, skills, company, summary and text (capped) | `POST /v1/resume/embed`, `EmbeddingService.ts` |
| 10. MongoDB ingestion | Store resume + embedding | `resumes` document with parsed fields, `fileHash`, parser, text source, embedding model and dimension | `ResumeingestionRepository.ts` |
| 11. Ingestion service | One call does everything | Duplicate check (SHA-256) → extract → clean → parse → embed → store; returns `ingested` (201) or `duplicate` (200) with timings | `POST /v1/resume/inject`, `ResumeingestionService.ts` |
| 12. Error handling | Clear failures | Only PDF allowed / File too large (400), Resume extraction failed / Not a resume (422), LLM or embedding failure (502), ingestion failed (500) | `ingestionController.ts`, `ingestionRoutes.ts` |
| 13. Logging | Timings per step | JSON log with requestId, file name and extract / parse / embedding / MongoDB times | `ResumeingestionService.ts` |
| 14. Vector search index | Searchable embeddings | Atlas Vector Search index `resume_vector` (cosine, 1024) with `skills` and `totalExperience` filters; script waits until queryable | `npm run search:index` |
| 15. Semantic search | First search endpoint | Query embedding → `$vectorSearch` (local cosine fallback while the index builds); filters for skills, experience, location | `POST /v1/resume/search` |
| 16. Resume management | List, view, delete | Paginated list with filters, full document by id (no embedding), delete with `ingestion_files` clean-up | `GET /v1/resumes`, `GET/DELETE /v1/resumes/:id` |
| Batch ingestion | Ingest the resume folder | Batches of 5 or 10, 2 files in parallel, per-file status in `ingestion_files` so runs resume where they stopped; PDF, Word and HTML-as-.doc supported | `npm run ingest:batch`, `POST /v1/resume/batch-inject`, `GET /v1/resume/batch-status` |

---

## 4. Part B — Retrieval pipeline

Module: `src/modules/retrieval/`. Verification: `postman/HR-Retrieval.postman_collection.json` (Phase 1–19 folders) and `tests/unit`, `tests/integration`.

| Phase | Goal | Implementation | Endpoint / files |
|---|---|---|---|
| 1. Readiness check | Search only when data is ready | 200 when stored embeddings match the configured model and dimension, otherwise 503 with a reason | `GET /v1/search/readiness` |
| 2. Module scaffold | Retrieval inside the same server | Routes, controller, services, repository, types, utils under `src/modules/retrieval` | `retrievalRoutes.ts` |
| 3. Query embedding | Same model as ingestion | Embeds a query on demand; other models rejected | `POST /v1/embeddings` |
| 4. Resume repository | Read-only data access | `$search` and `$vectorSearch` queries returning the same projection (name, contact, role, company, skills, experience, 600-character snippet) | `ResumeRepository.ts` |
| 5. Atlas Search / BM25 | Keyword search | Index `resume_bm25` (`lucene.standard`) over text, skills, job titles, experience summary, role and company; matched skills reported | `POST /v1/search/bm25`, `npm run search:bm25-index` |
| 6. Vector search | Semantic search | Query embedding → `$vectorSearch` (`numCandidates` = max(10 × topK, 100)), optional exact cosine re-score, minimum-experience filter | `POST /v1/search/vector` |
| 7. SearchService methods | Shared search code | `bm25Search` and `vectorSearch` returning one candidate shape with sources | `SearchService.ts`, `candidateMapper.ts` |
| 8. Hybrid search | Both in parallel | BM25 and vector run independently; both lists returned side by side; degraded flag if one fails | `POST /v1/search/hybrid` |
| 9. Merge + deduplicate | One candidate pool | Lists interleaved, merged by resumeId keeping both scores and sources, snippets capped | `utils/deduplicate.ts` (`mergeCandidates`) |
| 10. Groq LLM service | LLM access | Re-ranking, candidate summaries and metadata extraction with JSON validation, retries and fallback key | `LLMService.ts`, `GroqClient.ts` |
| 11. Re-ranking endpoint | LLM ordering | Relevance 0–1 and a one-sentence reason per candidate; invented or repeated ids dropped | `POST /v1/search/rerank` |
| 12. Summarization | Candidate fit text | Short or detailed summary grounded in the candidate data, no gendered pronouns | `POST /v1/search/summarize` |
| 13. End-to-end service | Full pipeline | Validate → BM25 + vector → merge → top N → re-rank → top K → optional summaries | `SearchService.endToEndSearch` |
| 14. Final search endpoint | Public API | Options for each stage (`bm25TopK`, `vectorTopK`, `rerankTopN`, `finalTopK`, `summarize`, style, tokens) | `POST /v1/search` |
| 15. Fallback logic | Never fail when a part works | BM25-only or vector-only results, BM25 order when re-ranking fails, results kept when summaries fail; `degraded` and `warnings` | `SearchService.ts` |
| 16. Logging + timings | Observability | Request id (echoed in `X-Request-Id`) and per-component timings in every log line | `src/middleware/requestId.ts`, `logger.ts` |
| 17. Validation controls | Safe inputs | Query ≤ 1000 characters, topK ≤ 100, rerankTopN ≤ 20, finalTopK ≤ rerankTopN, JSON body ≤ 100 kB (413), malformed JSON (400) | `RetrievalValidationService.ts`, `app.ts` |
| 18. Automated tests | Regression safety | Unit tests (validation, mapping, de-duplication, LLM output, fallbacks) and integration tests | `npm test`, `npm run test:integration` |
| 19. AI Search | Product-ready results | Person-level de-duplication, re-rank score and reason in results, pipeline counts, shortlist summaries endpoint (see Part E) | `POST /v1/search`, `POST /v1/search/summaries` |

---

## 5. Part C — Web frontend

Project: `recruitbot-web/`. One commit per phase; each phase verified with a Playwright browser scenario before the next.

| Phase | Commit | Implementation |
|---|---|---|
| 1. Setup | `d509ae1` | Vite + React + TypeScript project, Tailwind theme, path aliases, ingestion feature folders, Vitest |
| 2. Upload UI | `75aa436` | Drag-and-drop zone, file picker, Upload button, page layout |
| 3. API integration | `fcea7af` | Axios client with request ids; `POST /v1/resume/inject` with form-data field `file`, 120 s timeout |
| 4. State store | `d287676` | Zustand ingestion store: selected file, progress, result, typed error |
| 5. Progress stages | `d8c98c4` | Upload → PDF processing → parsing → embedding → MongoDB → completed, driven by the real request state and returned timings |
| 6. Result screen | `526d7fe` | Success and "already ingested" screens with file name and resume id |
| 7. File validation | `2fc582d` | PDF only and 5 MB checks before upload (zod) |
| 8. Error handling | `b120bb0` | Errors mapped to the failed stage (extraction, parsing, embedding, storage, network) with Retry and Choose another file |
| 9. Ingestion checkpoint | `6f99477` | End-to-end check of the ingestion feature |
| 10. Retrieval infrastructure | `66c0b89` | UI primitives, stores, router (`/` chat, `/ingestion`), app shell |
| 11. Sidebar | `541e439` | Search modes, hybrid weight sliders and presets, results limit |
| 12. Chat interface | `dc9dea3` | Top bar, chat thread, suggestion chips, auto-growing input (Enter / Shift+Enter), mobile drawer |
| 13. Search and results | `eb2c71c` | Adapter to `/v1/search/vector`, `/bm25`, `/hybrid`; client-side hybrid fusion (min-max scaling + weights); result cards |
| 14. Candidate profile | `c84d906` | Modal with contact, skills, experience, education from `GET /v1/resumes/:id` |
| 15. Final checklist | `3e73892` | Lazy-loaded pages and modal, accessibility fixes, deployment config; Lighthouse accessibility 100 |

---

## 6. Part D — Rebrand and UX (commit `e1ee54e`)

| Change | Details |
|---|---|
| Name and logo | RecruitBot → **TalentLens AI**; supplied logo made transparent and used as wordmark (sidebar, upload page), mark (chat avatar, top bar) and favicon |
| Palette | Light theme: Deep Navy `#0B1F3A`, Electric Blue `#2563EB`, Indigo `#6366F1`, Emerald `#10B981`, background `#F8FAFC`, cards `#FFFFFF`, text `#0F172A` / `#64748B`, borders `#E2E8F0`; darker text shades of the mode colours keep WCAG AA contrast |
| Guide | `/help` page — quick start, search modes, how ingestion and search work, tips — linked next to the app name |
| Layout | Clear moved next to Send (disabled on an empty chat; abandons a running search); larger blue search-mode badge |
| Fixes | A search cleared while running no longer drops its reply into the empty thread; form fields given `id` / `name` |

---

## 7. Part E — AI Search enhancements (commit `fc0e8a2`)

Requirement: re-ranking, de-duplication of repeated results, summarization, end-to-end pipeline integration, clear result display, responsive design, and loading / success / validation / error messages.

**Backend**

| Feature | Implementation |
|---|---|
| Person-level de-duplication | `dedupeByPerson()`: same normalised email, or phone (last 10 digits); name only when neither resume has contact details. Keeps the best-ranked resume, best scores, union of sources, and lists the others in `duplicates`. Found 6 people with 2 resume files each in the data. |
| Re-ranking details | The re-ranker's `relevanceScore` (0–1) and `reason` are now returned with each result (null when re-ranking fell back) |
| Display fields | `bm25Score`, `vectorScore`, `email`, `phone`, `snippet`, `matchedSkills`, `duplicates` per result; `pipeline` counts (retrieved, unique resumes, duplicates merged, re-ranked, returned) per response |
| Shortlist summaries | `POST /v1/search/summaries { query, resumeIds }` — one Groq call returns an overall summary and a fit summary per candidate; data loaded server-side by id; unknown, repeated or too many ids rejected |
| Privacy | Email and phone are used for de-duplication but never sent to the LLM |

**Frontend**

| Feature | Implementation |
|---|---|
| AI Search mode (default) | `POST /v1/search` (results limit = `finalTopK`, at least 10 candidates re-ranked); results shown first, summaries fetched afterwards |
| Result display | Pipeline header; AI summary card; cards with rank, relevance, "Keyword match" / "Semantic match", experience, contact, **Why this match**, fit summary, skills with query matches highlighted, "+1 more resume — Also on file: …" |
| Loading | "Searching resumes, removing duplicates and re-ranking with AI…" with elapsed seconds; shimmer placeholders for summaries |
| Validation | Character counter from 800; over 1,000 characters an error message and Send disabled |
| Errors | Friendly message per backend error code, network error or timeout, with Retry search / Retry summary; no duplicate toasts |
| Degraded results | Amber notice when AI re-ranking, semantic or keyword search was unavailable |
| Responsive | Wrapping chips and header, score below the name on narrow screens; no horizontal overflow at 375 px |

---

## 8. API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Server health |
| POST | `/v1/resume/upload` · `/extract` · `/clean` · `/parse` · `/skills` · `/llm-parse` · `/embed` | Ingestion steps one by one (form-data `file`) |
| POST | `/v1/resume/inject` | Full ingestion of one PDF |
| POST / GET | `/v1/resume/batch-inject` · `/v1/resume/batch-status` | Batch ingestion |
| POST | `/v1/resume/search` | Phase 15 semantic search |
| GET / DELETE | `/v1/resumes`, `/v1/resumes/:id` | Resume management |
| GET | `/v1/search/readiness` | Retrieval readiness |
| POST | `/v1/embeddings` | Query embedding |
| POST | `/v1/search/bm25` · `/vector` · `/hybrid` | Retrieval strategies |
| POST | `/v1/search/rerank` · `/summarize` | LLM re-ranking and single summaries |
| POST | `/v1/search` | End-to-end pipeline (AI Search) |
| POST | `/v1/search/summaries` | Shortlist + per-candidate summaries |

---

## 9. Verification summary

| Check | Result |
|---|---|
| Backend unit tests (`npm test`) | 48 / 48 pass |
| Frontend unit and component tests (Vitest) | 56 / 56 pass |
| Type checks, lint (oxlint), production build | Pass |
| Browser scenario — AI Search (real backend and Groq) | 30 / 30 checks pass |
| Browser regression — frontend Phases 7–15 | All pass |
| Postman — retrieval Phase 19 (Newman) | 7 requests, 21 / 21 assertions pass |
| Lighthouse (production build, before AI Search) | Accessibility 100 on `/` and `/ingestion` |

Known limits: Groq's free tier allows 8,000 tokens per minute per key; each AI Search uses two LLM calls, so a burst of searches can trigger the "re-ranking unavailable" notice or the summary Retry. Production deployment needs the API on the same origin (reverse proxy) or CORS on the backend.
