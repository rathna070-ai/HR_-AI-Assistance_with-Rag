interface UploadProgressProps {
  selectedFile: File | null;
}

// Status area under the upload controls.
export function UploadProgress({ selectedFile }: UploadProgressProps) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-bg-base/60 px-4 py-3 text-sm" aria-live="polite">
      {selectedFile ? (
        <p className="text-text-primary">
          Ready to upload: <span className="font-medium">{selectedFile.name}</span>
        </p>
      ) : (
        <p className="text-text-muted">No file selected</p>
      )}
    </div>
  );
}
