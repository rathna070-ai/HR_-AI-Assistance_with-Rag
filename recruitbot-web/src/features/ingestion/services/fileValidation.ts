import { z } from "zod";

// Same limit as the backend (multer, 5MB).
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const VALIDATION_MESSAGES = {
  empty: "Please select a file",
  notPdf: "Only PDF allowed",
  tooLarge: "Maximum 5MB allowed",
} as const;

// Browsers sometimes report PDFs with an empty or generic type, so the
// extension decides together with the reported type.
const PDF_TYPES = ["application/pdf", "application/x-pdf", "application/octet-stream", ""];

const resumeFileSchema = z
  .instanceof(File, { message: VALIDATION_MESSAGES.empty })
  .refine((f) => f.name.toLowerCase().endsWith(".pdf") && PDF_TYPES.includes(f.type), { message: VALIDATION_MESSAGES.notPdf })
  .refine((f) => f.size <= MAX_FILE_BYTES, { message: VALIDATION_MESSAGES.tooLarge });

// Returns the first validation message, or null when the file can be uploaded.
export const validateResumeFile = (file: File | null | undefined): string | null => {
  const result = resumeFileSchema.safeParse(file);
  return result.success ? null : result.error.issues[0].message;
};
