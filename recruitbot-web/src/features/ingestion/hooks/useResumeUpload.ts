import axios from "axios";
import { validateResumeFile } from "../services/fileValidation";
import { ingestionApi } from "../services/ingestion.api";
import { useIngestionStore } from "../stores/ingestion.store";
import type { IngestionErrorBody } from "../types/ingestion.types";

// Validates the file, runs one upload through the API service and records the
// outcome in the store. Invalid input never reaches the API.
export function useResumeUpload() {
  const store = useIngestionStore();

  const selectFile = (file: File) => {
    const problem = validateResumeFile(file);
    if (problem) store.rejectFile(problem);
    else store.selectFile(file);
  };

  const upload = async () => {
    const { selectedFile, isUploading } = useIngestionStore.getState();
    if (isUploading) return; // no double submit
    const problem = validateResumeFile(selectedFile);
    if (problem || !selectedFile) {
      store.rejectFile(problem ?? "Please select a file");
      return;
    }
    store.startUpload();
    try {
      const response = await ingestionApi.injectResume(selectedFile, store.setUploadProgress);
      store.uploadSucceeded(response.data);
    } catch (err) {
      const body = axios.isAxiosError<IngestionErrorBody>(err) ? err.response?.data : undefined;
      store.uploadFailed(body?.message ?? "Upload failed");
    }
  };

  return { ...store, selectFile, upload };
}
