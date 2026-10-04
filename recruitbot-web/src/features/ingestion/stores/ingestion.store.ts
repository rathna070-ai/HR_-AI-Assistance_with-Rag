import { create } from "zustand";
import type { IngestionResult } from "../types/ingestion.types";

// Ingestion-only UI state. It never touches the retrieval/search stores.
export interface IngestionState {
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress: number; // 0-100, bytes sent to the backend
  successResult: IngestionResult | null;
  error: string | null;
  validationError: string | null;

  selectFile: (file: File) => void;
  rejectFile: (message: string) => void;
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
  validationError: null,
};

export const useIngestionStore = create<IngestionState>((set) => ({
  ...initialState,
  // A new valid file clears the previous attempt's status and any validation message.
  selectFile: (file) => set({ selectedFile: file, uploadProgress: 0, successResult: null, error: null, validationError: null }),
  // An invalid selection is not kept, so it can never be uploaded.
  rejectFile: (message) => set({ selectedFile: null, uploadProgress: 0, successResult: null, error: null, validationError: message }),
  startUpload: () => set({ isUploading: true, uploadProgress: 0, successResult: null, error: null, validationError: null }),
  setUploadProgress: (percent) => set({ uploadProgress: percent }),
  uploadSucceeded: (result) => set({ isUploading: false, uploadProgress: 100, successResult: result, error: null }),
  uploadFailed: (error) => set({ isUploading: false, successResult: null, error }),
  reset: () => set(initialState),
}));
