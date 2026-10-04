import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, validateResumeFile } from "./fileValidation";

const pdf = (size = 1000, name = "resume.pdf", type = "application/pdf") => new File([new Uint8Array(size)], name, { type });

describe("validateResumeFile", () => {
  it("requires a file", () => {
    expect(validateResumeFile(null)).toBe("Please select a file");
    expect(validateResumeFile(undefined)).toBe("Please select a file");
  });

  it("accepts a PDF up to 5MB", () => {
    expect(validateResumeFile(pdf())).toBeNull();
    expect(validateResumeFile(pdf(MAX_FILE_BYTES))).toBeNull();
    expect(validateResumeFile(pdf(1000, "RESUME.PDF", ""))).toBeNull();
  });

  it("rejects non-PDF files", () => {
    expect(validateResumeFile(pdf(10, "resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toBe(
      "Only PDF allowed",
    );
    expect(validateResumeFile(pdf(10, "notes.txt", "text/plain"))).toBe("Only PDF allowed");
    expect(validateResumeFile(pdf(10, "fake.pdf", "image/png"))).toBe("Only PDF allowed");
  });

  it("rejects PDFs over 5MB", () => {
    expect(validateResumeFile(pdf(MAX_FILE_BYTES + 1))).toBe("Maximum 5MB allowed");
  });
});
