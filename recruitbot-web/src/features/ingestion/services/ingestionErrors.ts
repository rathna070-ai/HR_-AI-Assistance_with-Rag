import axios from "axios";
import type { IngestionErrorBody } from "../types/ingestion.types";

// Maps the backend's ingestion error messages (see the ingestion doc, Phase 12)
// to the pipeline stage that failed and a user-facing title.
export type IngestionStageId = "upload" | "extract" | "parse" | "embed" | "store" | "done";

export type IngestionErrorKind = "extraction" | "parsing" | "embedding" | "storage" | "rejected" | "network" | "unknown";

export interface IngestionError {
  kind: IngestionErrorKind;
  title: string;
  // The backend's own message when it sent one.
  message: string;
}

const KNOWN_BACKEND_ERRORS: { match: RegExp; kind: IngestionErrorKind; stage: IngestionStageId; title: string }[] = [
  { match: /resume extraction failed/i, kind: "extraction", stage: "extract", title: "PDF extraction failed" },
  { match: /llm resume parsing failed|not a resume/i, kind: "parsing", stage: "parse", title: "Resume parsing failed" },
  { match: /mistral embedding failed/i, kind: "embedding", stage: "embed", title: "Embedding generation failed" },
  { match: /^ingestion failed/i, kind: "storage", stage: "store", title: "MongoDB ingestion failed" },
  { match: /only pdf allowed|file too large|no file uploaded|unexpected field/i, kind: "rejected", stage: "upload", title: "Upload rejected" },
];

export const failedStageFor = (message: string): IngestionStageId | null =>
  KNOWN_BACKEND_ERRORS.find((e) => e.match.test(message))?.stage ?? null;

// Turns any upload failure into a typed error. A request with no response is a
// network error, never a parsing or MongoDB error.
export const toIngestionError = (err: unknown): IngestionError => {
  if (axios.isAxiosError<IngestionErrorBody>(err)) {
    if (!err.response) {
      const timedOut = err.code === "ECONNABORTED";
      return {
        kind: "network",
        title: "Network error",
        message: timedOut ? "The server did not respond in time." : "Could not reach the server. Check that the backend is running.",
      };
    }
    const message = err.response.data?.message ?? `HTTP ${err.response.status}`;
    const known = KNOWN_BACKEND_ERRORS.find((e) => e.match.test(message));
    if (known) return { kind: known.kind, title: known.title, message };
    return { kind: "unknown", title: "Upload failed", message };
  }
  return { kind: "unknown", title: "Upload failed", message: err instanceof Error ? err.message : "Unexpected error" };
};
