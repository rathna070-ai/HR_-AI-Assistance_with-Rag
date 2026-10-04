import { useState } from "react";
import { UploadButton } from "./UploadButton";
import { UploadDropzone } from "./UploadDropzone";
import { UploadProgress } from "./UploadProgress";

// Phase 2: the upload surface only. The button is connected to the backend
// in Phase 3; nothing here reports a success.
export function ResumeUploadCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-bg-card p-6 shadow-xl">
      <UploadDropzone selectedFile={selectedFile} onFileSelected={setSelectedFile} />
      <UploadButton disabled={!selectedFile} onClick={() => undefined} />
      <UploadProgress selectedFile={selectedFile} />
    </section>
  );
}
