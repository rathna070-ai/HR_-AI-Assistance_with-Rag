import { useIngestionStore } from "../stores/ingestion.store";

// Status area under the upload controls; reads the ingestion store.
export function UploadProgress() {
  const { selectedFile, isUploading, uploadProgress, successResult, error } = useIngestionStore();

  let content;
  if (isUploading) content = <p className="text-text-primary">Uploading... {uploadProgress}%</p>;
  else if (successResult)
    content = (
      <p className="text-score-hybrid">
        {successResult.status === "ingested" ? "Resume ingested successfully" : "Resume already ingested"}
      </p>
    );
  else if (error) content = <p className="text-red-400">{error}</p>;
  else if (selectedFile)
    content = (
      <p className="text-text-primary">
        Ready to upload: <span className="font-medium">{selectedFile.name}</span>
      </p>
    );
  else content = <p className="text-text-muted">No file selected</p>;

  return (
    <div className="rounded-lg border border-white/[0.07] bg-bg-base/60 px-4 py-3 text-sm" aria-live="polite">
      {content}
    </div>
  );
}
