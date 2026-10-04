import { useResumeUpload } from "../hooks/useResumeUpload";
import { UploadButton } from "./UploadButton";
import { UploadDropzone } from "./UploadDropzone";
import { UploadError } from "./UploadError";
import { UploadProgress } from "./UploadProgress";
import { UploadResult } from "./UploadResult";

export function ResumeUploadCard() {
  const { selectedFile, isUploading, successResult, error, selectFile, upload, reset } = useResumeUpload();

  return (
    <div className="flex flex-col gap-4">
      {successResult ? (
        <UploadResult result={successResult} onUploadAnother={reset} />
      ) : (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-bg-card p-6 shadow-sm">
          <UploadDropzone selectedFile={selectedFile} disabled={isUploading} onFileSelected={selectFile} />
          {/* Enabled without a file so an empty submit shows "Please select a file". */}
          <UploadButton isUploading={isUploading} onClick={upload} />
          {error && !isUploading && (
            <UploadError
              error={error}
              // Retrying a file the backend rejected outright would fail the same way.
              canRetry={!!selectedFile && error.kind !== "rejected"}
              onRetry={upload}
              onChooseAnother={reset}
            />
          )}
        </section>
      )}
      <UploadProgress />
    </div>
  );
}
