import { create } from "zustand";
import type { IngestionResult } from "../types/ingestion.types";

// Ingestion-only UI state. It never touches the retrieval/search stores.
export interface IngestionState {
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress: number; // 0-100, bytes sent to the backend
  successResult: IngestionResult | null;
  error: string | null;

  selectFile: (file: File) => void;
  startUpload: () => void;
  setUploadProgress: (percent: number) => void;
  uploadSucceeded: (result: IngestionResult) => void;
  uploadFailed: (error: string) => void;
  reset: () => void;
}

const initialState = {
  selectedFile: null,
  isUploading: false,
  uploadProgress: 0,
  successResult: null,
  error: null,
};

export const useIngestionStore = create<IngestionState>((set) => ({
  ...initialState,
  // A new file clears the previous attempt's status.
  selectFile: (file) => set({ selectedFile: file, uploadProgress: 0, successResult: null, error: null }),
  startUpload: () => set({ isUploading: true, uploadProgress: 0, successResult: null, error: null }),
  setUploadProgress: (percent) => set({ uploadProgress: percent }),
  uploadSucceeded: (result) => set({ isUploading: false, uploadProgress: 100, successResult: result, error: null }),
  uploadFailed: (error) => set({ isUploading: false, successResult: null, error }),
  reset: () => set(initialState),
}));
