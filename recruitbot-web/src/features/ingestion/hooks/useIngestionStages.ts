import { failedStageFor, type IngestionStageId } from "../services/ingestionErrors";
import type { IngestionResult } from "../types/ingestion.types";

export type StageState = "pending" | "active" | "done" | "skipped" | "failed";

export interface IngestionStage {
  id: IngestionStageId;
  label: string;
  state: StageState;
  detail?: string;
}

const STAGES: { id: IngestionStageId; label: string; timing?: keyof IngestionResult["timings"] }[] = [
  { id: "upload", label: "Resume Upload" },
  { id: "extract", label: "PDF Processing", timing: "extractMs" },
  { id: "parse", label: "Resume Parsing", timing: "parseMs" },
  { id: "embed", label: "Embedding Generation", timing: "embeddingMs" },
  { id: "store", label: "MongoDB ingestion", timing: "mongoInsertMs" },
  { id: "done", label: "Completed" },
];

interface StageInput {
  isUploading: boolean;
  uploadProgress: number;
  successResult: IngestionResult | null;
  error: string | null;
}

// Stage states derived only from what the API actually reports: the upload
// percentage while sending, "processing" while waiting, and the backend's
// timings once it confirms success. Nothing is marked done before then.
export function getIngestionStages({ isUploading, uploadProgress, successResult, error }: StageInput): IngestionStage[] {
  if (successResult) {
    const duplicate = successResult.status === "duplicate";
    return STAGES.map(({ id, label, timing }) => {
      if (id === "upload" || id === "done") return { id, label, state: "done" };
      if (duplicate) return { id, label, state: "skipped", detail: "already ingested" };
      const ms = timing ? successResult.timings[timing] : undefined;
      return { id, label, state: "done", detail: ms !== undefined ? `${ms} ms` : undefined };
    });
  }

  if (error) {
    // Known backend errors name the failed stage; anything else (e.g. a
    // network error) fails at the stage that was running.
    const failed = failedStageFor(error) ?? (uploadProgress < 100 ? "upload" : "extract");
    const failedIndex = STAGES.findIndex((s) => s.id === failed);
    return STAGES.map(({ id, label }, i) => ({
      id,
      label,
      state: i < failedIndex ? "done" : i === failedIndex ? "failed" : "pending",
    }));
  }

  if (isUploading) {
    const uploaded = uploadProgress >= 100;
    return STAGES.map(({ id, label }) => {
      if (id === "upload") return { id, label, state: uploaded ? "done" : "active", detail: uploaded ? undefined : `${uploadProgress}%` };
      if (id === "extract" && uploaded) return { id, label, state: "active", detail: "backend processing" };
      return { id, label, state: "pending" };
    });
  }

  return STAGES.map(({ id, label }) => ({ id, label, state: "pending" }));
}
