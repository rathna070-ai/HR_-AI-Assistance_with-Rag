// Maps the backend's ingestion error messages to the pipeline stage that
// failed. The messages are the backend's own (see the ingestion doc, Phase 12).
export type IngestionStageId = "upload" | "extract" | "parse" | "embed" | "store" | "done";

export const KNOWN_BACKEND_ERRORS: { match: RegExp; stage: IngestionStageId }[] = [
  { match: /resume extraction failed/i, stage: "extract" },
  { match: /llm resume parsing failed|not a resume/i, stage: "parse" },
  { match: /mistral embedding failed/i, stage: "embed" },
  { match: /^ingestion failed/i, stage: "store" },
  { match: /only pdf allowed|file too large|no file uploaded|unexpected field/i, stage: "upload" },
];

export const failedStageFor = (message: string): IngestionStageId | null =>
  KNOWN_BACKEND_ERRORS.find((e) => e.match.test(message))?.stage ?? null;
