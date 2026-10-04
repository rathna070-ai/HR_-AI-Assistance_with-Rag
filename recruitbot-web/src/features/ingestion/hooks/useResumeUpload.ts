import { validateResumeFile } from "../services/fileValidation";
import { ingestionApi } from "../services/ingestion.api";
import { toIngestionError } from "../services/ingestionErrors";
import { useIngestionStore } from "../stores/ingestion.store";

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
      // Shown as an error state; never retried automatically, so a stored
      // resume is not submitted twice behind the user's back.
      store.uploadFailed(toIngestionError(err));
    }
  };

  return { ...store, selectFile, upload };
}
