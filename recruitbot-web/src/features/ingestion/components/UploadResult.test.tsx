import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadResult } from "./UploadResult";

const ingested = { fileName: "a.pdf", status: "ingested" as const, resumeId: "6abba27fa24280e1b4ab36ac", timings: { embeddingMs: 900 } };

describe("UploadResult", () => {
  it("shows the completed ingestion checklist and resume id", () => {
    render(<UploadResult result={ingested} onUploadAnother={vi.fn()} />);
    expect(screen.getByText("Resume ingestion completed")).toBeInTheDocument();
    for (const line of [
      "Resume uploaded successfully",
      "Embedding generated successfully",
      "MongoDB ingestion completed",
      "Vector search ready",
    ]) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByTestId("resume-id")).toHaveTextContent("6abba27fa24280e1b4ab36ac");
  });

  it("does not claim a new embedding for a duplicate", () => {
    render(<UploadResult result={{ ...ingested, status: "duplicate", timings: {} }} onUploadAnother={vi.fn()} />);
    expect(screen.getByText("Resume already ingested")).toBeInTheDocument();
    expect(screen.queryByText("Embedding generated successfully")).not.toBeInTheDocument();
  });

  it("calls onUploadAnother", () => {
    const onUploadAnother = vi.fn();
    render(<UploadResult result={ingested} onUploadAnother={onUploadAnother} />);
    fireEvent.click(screen.getByRole("button", { name: "Upload another resume" }));
    expect(onUploadAnother).toHaveBeenCalledOnce();
  });
});
