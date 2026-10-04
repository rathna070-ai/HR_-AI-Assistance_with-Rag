// Response of the existing backend endpoint POST /v1/resume/inject.
export interface IngestionTimings {
  extractMs?: number;
  parseMs?: number;
  embeddingMs?: number;
  mongoInsertMs?: number;
}

export interface IngestionResult {
  fileName: string;
  // "duplicate" = the same file was already stored; nothing was re-processed.
  status: "ingested" | "duplicate";
  resumeId: string;
  timings: IngestionTimings;
}

export interface IngestionResponse {
  success: true;
  message: string;
  data: IngestionResult;
}

// Error body returned by the backend: { success: false, message }.
export interface IngestionErrorBody {
  success: false;
  message: string;
}
