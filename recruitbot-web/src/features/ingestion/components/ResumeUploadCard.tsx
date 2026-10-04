import axios from "axios";
import { useState } from "react";
import { ingestionApi } from "../services/ingestion.api";
import type { IngestionErrorBody } from "../types/ingestion.types";
import { UploadButton } from "./UploadButton";
import { UploadDropzone } from "./UploadDropzone";
import { UploadProgress } from "./UploadProgress";

export function ResumeUploadCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectFile = (file: File) => {
    setSelectedFile(file);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const upload = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const response = await ingestionApi.injectResume(selectedFile);
      setSuccessMessage(response.message);
    } catch (err) {
      const body = axios.isAxiosError<IngestionErrorBody>(err) ? err.response?.data : undefined;
      setErrorMessage(body?.message ?? "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-bg-card p-6 shadow-xl">
      <UploadDropzone selectedFile={selectedFile} disabled={isUploading} onFileSelected={selectFile} />
      <UploadButton disabled={!selectedFile} isUploading={isUploading} onClick={upload} />
      <UploadProgress
        selectedFile={selectedFile}
        isUploading={isUploading}
        successMessage={successMessage}
        errorMessage={errorMessage}
      />
    </section>
  );
}
