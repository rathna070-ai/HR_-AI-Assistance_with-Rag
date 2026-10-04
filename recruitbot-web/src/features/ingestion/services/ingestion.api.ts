import { INGESTION_TIMEOUT_MS } from "@/config/api.config";
import apiClient from "@/lib/api/client";
import type { IngestionResponse } from "../types/ingestion.types";

export const ingestionApi = {
  // POST /v1/resume/inject with the PDF in the form-data field "file",
  // exactly as the backend expects. The browser sets the multipart boundary.
  async injectResume(file: File, onUploadProgress?: (percent: number) => void): Promise<IngestionResponse> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<IngestionResponse>("/v1/resume/inject", form, {
      timeout: INGESTION_TIMEOUT_MS,
      // The upload card shows its own error state.
      suppressErrorToast: true,
      onUploadProgress: (event) => {
        if (onUploadProgress && event.total) onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  },
};
