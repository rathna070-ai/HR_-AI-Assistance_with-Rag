import { CheckCircle2, RotateCcw } from "lucide-react";
import type { IngestionResult } from "../types/ingestion.types";

interface UploadResultProps {
  result: IngestionResult;
  onUploadAnother: () => void;
}

// Shown after the backend confirms success. Each line is backed by the
// response: a resumeId means it was stored; timings show the steps that ran.
// "Vector search ready" follows from storage: the Atlas vector index covers
// every stored resume embedding.
export function UploadResult({ result, onUploadAnother }: UploadResultProps) {
  const duplicate = result.status === "duplicate";
  const items = duplicate
    ? ["Resume uploaded successfully", "Already stored: the same file was ingested before", "Vector search ready"]
    : ["Resume uploaded successfully", "Embedding generated successfully", "MongoDB ingestion completed", "Vector search ready"];

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-score-hybrid/30 bg-bg-card p-6 shadow-sm"
      data-testid="ingestion-result"
    >
      <h2 className="text-lg font-semibold text-text-primary">{duplicate ? "Resume already ingested" : "Resume ingestion completed"}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-text-primary">
            <CheckCircle2 className="h-4 w-4 text-score-hybrid" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-bg-base px-4 py-3 text-xs">
        <dt className="text-text-muted">File</dt>
        <dd className="truncate text-text-primary">{result.fileName}</dd>
        <dt className="text-text-muted">Resume ID</dt>
        <dd className="font-mono text-text-primary" data-testid="resume-id">
          {result.resumeId}
        </dd>
      </dl>
      <button
        type="button"
        onClick={onUploadAnother}
        className="flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-text-primary transition-colors hover:bg-slate-100"
        aria-label="Upload another resume"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Upload Another Resume
      </button>
    </section>
  );
}
