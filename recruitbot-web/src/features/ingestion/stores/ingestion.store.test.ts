import { beforeEach, describe, expect, it } from "vitest";
import { useIngestionStore } from "./ingestion.store";

const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });
const result = { fileName: "resume.pdf", status: "ingested" as const, resumeId: "6abba27fa24280e1b4ab36ac", timings: {} };

describe("ingestion store", () => {
  beforeEach(() => useIngestionStore.getState().reset());

  it("starts empty", () => {
    const s = useIngestionStore.getState();
    expect(s.selectedFile).toBeNull();
    expect(s.isUploading).toBe(false);
    expect(s.successResult).toBeNull();
    expect(s.error).toBeNull();
  });

  it("goes selected -> uploading -> success", () => {
    const s = useIngestionStore.getState();
    s.selectFile(file);
    expect(useIngestionStore.getState().selectedFile).toBe(file);
    s.startUpload();
    expect(useIngestionStore.getState().isUploading).toBe(true);
    s.setUploadProgress(40);
    expect(useIngestionStore.getState().uploadProgress).toBe(40);
    s.uploadSucceeded(result);
    expect(useIngestionStore.getState()).toMatchObject({ isUploading: false, uploadProgress: 100, successResult: result, error: null });
  });

  it("records a failure and keeps the selected file for a retry", () => {
    const s = useIngestionStore.getState();
    s.selectFile(file);
    s.startUpload();
    s.uploadFailed("Resume extraction failed");
    expect(useIngestionStore.getState()).toMatchObject({ isUploading: false, error: "Resume extraction failed", selectedFile: file });
  });

  it("clears the stale status when a new file is selected", () => {
    const s = useIngestionStore.getState();
    s.selectFile(file);
    s.uploadFailed("Resume extraction failed");
    s.selectFile(new File(["%PDF"], "other.pdf", { type: "application/pdf" }));
    expect(useIngestionStore.getState().error).toBeNull();
    expect(useIngestionStore.getState().successResult).toBeNull();
  });
});
