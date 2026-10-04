# RecruitBot Web

React + TypeScript frontend for the HR resume backend in the parent folder: upload resumes (ingestion) and search candidates (retrieval).

| Route | Page |
|---|---|
| `/` | Candidate search chat (Vector, BM25, Hybrid) |
| `/ingestion` | Resume upload |

## Run locally

1. Start the backend from the repository root: `npm run dev` (http://localhost:3000).
2. In this folder:
   ```bash
   npm install
   npm run dev
   ```
3. Open http://localhost:5173.

In development the browser calls `/v1/...` on the same origin and Vite forwards it to the backend (`vite.config.ts`), because the backend sends no CORS headers.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit and component tests (Vitest + React Testing Library) |
| `npm run lint` | Lint (oxlint) |
| `npm run format` | Format with Prettier |

## Backend endpoints used

| Feature | Endpoint |
|---|---|
| Resume upload | `POST /v1/resume/inject` (form-data field `file`, PDF, max 5MB) |
| Vector search | `POST /v1/search/vector` |
| BM25 search | `POST /v1/search/bm25` |
| Hybrid search | `POST /v1/search/hybrid`, blended in the browser with the sidebar weights (`src/lib/utils/hybridFusion.ts`) |
| Candidate profile, result details | `GET /v1/resumes/:id` |

The frontend guide describes `POST /search/resumes` and `GET /candidate/:id`; the backend does not have those, so `src/lib/api/search.api.ts` and `candidate.api.ts` map the guide's request and response types onto the endpoints above.

## Deployment

`vercel.json` builds with Vite and rewrites client-side routes (such as `/ingestion`) to `index.html`. Set `VITE_API_BASE_URL` to the backend URL. The backend has no CORS headers, so either serve it from the same origin (reverse proxy) or add CORS to the backend first.
