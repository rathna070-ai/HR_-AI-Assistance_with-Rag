import { Check, Circle, Loader2, MinusCircle, X } from "lucide-react";
import { getIngestionStages, type StageState } from "../hooks/useIngestionStages";
import { useIngestionStore } from "../stores/ingestion.store";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<StageState, React.ReactNode> = {
  done: <Check className="h-4 w-4 text-score-hybrid" aria-hidden />,
  active: <Loader2 className="h-4 w-4 animate-spin text-score-vector" aria-hidden />,
  pending: <Circle className="h-4 w-4 text-text-muted" aria-hidden />,
  skipped: <MinusCircle className="h-4 w-4 text-text-muted" aria-hidden />,
  failed: <X className="h-4 w-4 text-red-400" aria-hidden />,
};

// Status line plus the ingestion pipeline stages.
export function UploadProgress() {
  const { selectedFile, isUploading, uploadProgress, successResult, error } = useIngestionStore();
  const stages = getIngestionStages({ isUploading, uploadProgress, successResult, error });

  let status;
  if (isUploading)
    status = <p className="text-text-primary">{uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : "Uploading... processing on the server"}</p>;
  else if (successResult)
    status = (
      <p className="text-score-hybrid">
        {successResult.status === "ingested" ? "Resume ingested successfully" : "Resume already ingested"}
      </p>
    );
  else if (error) status = <p className="text-red-400">{error}</p>;
  else if (selectedFile)
    status = (
      <p className="text-text-primary">
        Ready to upload: <span className="font-medium">{selectedFile.name}</span>
      </p>
    );
  else status = <p className="text-text-muted">No file selected</p>;

  return (
    <div className="rounded-lg border border-white/[0.07] bg-bg-base/60 px-4 py-3 text-sm">
      <div aria-live="polite">{status}</div>
      <ol className="mt-3 flex flex-col gap-2" aria-label="Ingestion progress" data-testid="ingestion-stages">
        {stages.map((stage) => (
          <li key={stage.id} data-state={stage.state} className="flex items-center gap-2">
            {ICONS[stage.state]}
            <span className={cn(stage.state === "pending" || stage.state === "skipped" ? "text-text-muted" : "text-text-primary", stage.state === "failed" && "text-red-400")}>
              {stage.label}
            </span>
            {stage.detail && <span className="ml-auto text-xs text-text-muted">{stage.detail}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
