import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { failedStageFor, toIngestionError } from "./ingestionErrors";

const httpError = (status: number, message: string) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, { status, statusText: "", headers: {}, config, data: { success: false, message } });
};

describe("toIngestionError", () => {
  it.each([
    [422, "Resume extraction failed", "extraction", "PDF extraction failed"],
    [502, "LLM resume parsing failed", "parsing", "Resume parsing failed"],
    [422, "Not a resume", "parsing", "Resume parsing failed"],
    [502, "Mistral embedding failed", "embedding", "Embedding generation failed"],
    [500, "ingestion failed", "storage", "MongoDB ingestion failed"],
    [400, "Only PDF allowed", "rejected", "Upload rejected"],
  ])("maps %i %s", (status, message, kind, title) => {
    expect(toIngestionError(httpError(status, message))).toEqual({ kind, title, message });
  });

  it("treats a missing response as a network error", () => {
    const err = new AxiosError("Network Error", "ERR_NETWORK", { headers: new AxiosHeaders() });
    expect(toIngestionError(err)).toMatchObject({ kind: "network", title: "Network error" });
  });

  it("keeps unknown backend messages", () => {
    expect(toIngestionError(httpError(503, "Service unavailable"))).toEqual({ kind: "unknown", title: "Upload failed", message: "Service unavailable" });
  });
});

describe("failedStageFor", () => {
  it("names the failed stage", () => {
    expect(failedStageFor("Mistral embedding failed")).toBe("embed");
    expect(failedStageFor("Could not reach the server")).toBeNull();
  });
});
