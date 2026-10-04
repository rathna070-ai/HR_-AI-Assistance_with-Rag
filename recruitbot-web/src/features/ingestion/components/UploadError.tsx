import { AlertTriangle, FilePlus2, RotateCw } from "lucide-react";
import type { IngestionError } from "../services/ingestionErrors";

interface UploadErrorProps {
  error: IngestionError;
  canRetry: boolean;
  onRetry: () => void;
  onChooseAnother: () => void;
}

export function UploadError({ error, canRetry, onRetry, onChooseAnother }: UploadErrorProps) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3" role="alert" data-testid="upload-error">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-text-primary">Upload failed</p>
          <p className="text-red-700" data-testid="upload-error-title">
            {error.title}
          </p>
          {error.message !== error.title && <p className="mt-1 text-xs text-text-muted">{error.message}</p>}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label="Retry upload"
            className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-slate-200"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
          </button>
        )}
        <button
          type="button"
          onClick={onChooseAnother}
          aria-label="Choose another file"
          className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-slate-100"
        >
          <FilePlus2 className="h-3.5 w-3.5" aria-hidden /> Choose Another File
        </button>
      </div>
    </div>
  );
}
