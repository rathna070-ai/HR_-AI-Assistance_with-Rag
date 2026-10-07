import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { toSearchError } from "./searchErrors";

const httpError = (status: number, data: unknown) =>
  new AxiosError(
    "failed",
    "ERR_BAD_RESPONSE",
    undefined,
    {},
    { status, data, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } },
  );

describe("toSearchError", () => {
  it("maps backend error codes to friendly messages", () => {
    expect(toSearchError(httpError(503, { errorCode: "SEARCH_UNAVAILABLE", message: "x" }))).toMatchObject({
      title: "Search is temporarily unavailable",
      retryable: true,
    });
  });

  it("keeps the backend's message for validation errors and does not offer a retry", () => {
    const error = toSearchError(
      httpError(400, { errorCode: "INVALID_SEARCH_QUERY", message: "Search query must be at most 1000 characters" }),
    );
    expect(error).toEqual({ title: "Check your query", message: "Search query must be at most 1000 characters", retryable: false });
  });

  it("reports a missing response as a network error, and a timeout separately", () => {
    expect(toSearchError(new AxiosError("Network Error", "ERR_NETWORK")).title).toBe("Can't reach the server");
    expect(toSearchError(new AxiosError("timeout", "ECONNABORTED")).title).toBe("The search took too long");
  });

  it("falls back to a generic server error for unknown 5xx responses", () => {
    expect(toSearchError(httpError(500, {}))).toMatchObject({ title: "Server error", retryable: true });
  });
});
