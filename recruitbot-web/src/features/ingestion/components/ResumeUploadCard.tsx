import { useResumeUpload } from "../hooks/useResumeUpload";
import { UploadButton } from "./UploadButton";
import { UploadDropzone } from "./UploadDropzone";
import { UploadProgress } from "./UploadProgress";
import { UploadResult } from "./UploadResult";

export function ResumeUploadCard() {
  const { selectedFile, isUploading, successResult, selectFile, upload, reset } = useResumeUpload();

  return (
    <div className="flex flex-col gap-4">
      {successResult ? (
        <UploadResult result={successResult} onUploadAnother={reset} />
      ) : (
        <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-bg-card p-6 shadow-xl">
          <UploadDropzone selectedFile={selectedFile} disabled={isUploading} onFileSelected={selectFile} />
          {/* Enabled without a file so an empty submit shows "Please select a file". */}
          <UploadButton isUploading={isUploading} onClick={upload} />
        </section>
      )}
      <UploadProgress />
    </div>
  );
}
