import axios from "axios";
import { ingestionApi } from "../services/ingestion.api";
import { useIngestionStore } from "../stores/ingestion.store";
import type { IngestionErrorBody } from "../types/ingestion.types";

// Runs one upload through the API service and records the outcome in the store.
export function useResumeUpload() {
  const store = useIngestionStore();

  const upload = async () => {
    const { selectedFile, isUploading } = useIngestionStore.getState();
    if (!selectedFile || isUploading) return; // no double submit
    store.startUpload();
    try {
      const response = await ingestionApi.injectResume(selectedFile, store.setUploadProgress);
      store.uploadSucceeded(response.data);
    } catch (err) {
      const body = axios.isAxiosError<IngestionErrorBody>(err) ? err.response?.data : undefined;
      store.uploadFailed(body?.message ?? "Upload failed");
    }
  };

  return { ...store, upload };
}
