import { describe, expect, it } from "vitest";
import { getIngestionStages } from "./useIngestionStages";

const base = { isUploading: false, uploadProgress: 0, successResult: null, error: null };
const states = (s: ReturnType<typeof getIngestionStages>) => s.map((x) => `${x.id}:${x.state}`).join(" ");

describe("ingestion progress stages", () => {
  it("are all pending before an upload", () => {
    expect(getIngestionStages(base).every((s) => s.state === "pending")).toBe(true);
  });

  it("show the upload percentage, and only 'processing' once sent", () => {
    expect(states(getIngestionStages({ ...base, isUploading: true, uploadProgress: 40 }))).toBe(
      "upload:active extract:pending parse:pending embed:pending store:pending done:pending",
    );
    const sent = getIngestionStages({ ...base, isUploading: true, uploadProgress: 100 });
    expect(states(sent)).toBe("upload:done extract:active parse:pending embed:pending store:pending done:pending");
    expect(sent.some((s) => s.id === "done" && s.state === "done")).toBe(false);
  });

  it("are completed with the backend timings on success", () => {
    const stages = getIngestionStages({
      ...base,
      uploadProgress: 100,
      successResult: { fileName: "a.pdf", status: "ingested", resumeId: "x", timings: { extractMs: 80, parseMs: 900, embeddingMs: 300, mongoInsertMs: 40 } },
    });
    expect(stages.every((s) => s.state === "done")).toBe(true);
    expect(stages.find((s) => s.id === "parse")?.detail).toBe("900 ms");
  });

  it("mark processing as skipped for a duplicate", () => {
    const stages = getIngestionStages({ ...base, successResult: { fileName: "a.pdf", status: "duplicate", resumeId: "x", timings: {} } });
    expect(states(stages)).toBe("upload:done extract:skipped parse:skipped embed:skipped store:skipped done:done");
  });

  it("stop at the stage named by the backend error", () => {
    expect(states(getIngestionStages({ ...base, uploadProgress: 100, error: "Mistral embedding failed" }))).toBe(
      "upload:done extract:done parse:done embed:failed store:pending done:pending",
    );
    expect(getIngestionStages({ ...base, uploadProgress: 100, error: "Resume extraction failed" }).find((s) => s.state === "failed")?.id).toBe("extract");
    expect(getIngestionStages({ ...base, uploadProgress: 100, error: "Not a resume" }).find((s) => s.state === "failed")?.id).toBe("parse");
    expect(getIngestionStages({ ...base, uploadProgress: 100, error: "ingestion failed" }).find((s) => s.state === "failed")?.id).toBe("store");
  });
});
