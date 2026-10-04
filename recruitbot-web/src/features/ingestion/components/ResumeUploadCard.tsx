import { useResumeUpload } from "../hooks/useResumeUpload";
import { UploadButton } from "./UploadButton";
import { UploadDropzone } from "./UploadDropzone";
import { UploadProgress } from "./UploadProgress";

export function ResumeUploadCard() {
  const { selectedFile, isUploading, selectFile, upload } = useResumeUpload();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-bg-card p-6 shadow-xl">
      <UploadDropzone selectedFile={selectedFile} disabled={isUploading} onFileSelected={selectFile} />
      <UploadButton disabled={!selectedFile} isUploading={isUploading} onClick={upload} />
      <UploadProgress />
    </section>
  );
}
