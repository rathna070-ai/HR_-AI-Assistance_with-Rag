// Empty base URL = same origin: in development Vite proxies /v1 and /health
// to the backend on port 3000 (see vite.config.ts), which avoids CORS.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
export const API_TIMEOUT_MS = 30_000;
// Ingestion parses with an LLM and generates embeddings, which can take longer.
export const INGESTION_TIMEOUT_MS = 120_000;
// AI Search runs retrieval and an LLM re-rank; summaries are a second LLM call.
export const AI_SEARCH_TIMEOUT_MS = 60_000;
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? "TalentLens AI";
