interface UploadProgressProps {
  selectedFile: File | null;
  isUploading: boolean;
  successMessage: string | null;
  errorMessage: string | null;
}

// Status area under the upload controls; reflects the real API call.
export function UploadProgress({ selectedFile, isUploading, successMessage, errorMessage }: UploadProgressProps) {
  let content;
  if (isUploading) content = <p className="text-text-primary">Uploading...</p>;
  else if (successMessage) content = <p className="text-score-hybrid">{successMessage}</p>;
  else if (errorMessage) content = <p className="text-red-400">{errorMessage}</p>;
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
