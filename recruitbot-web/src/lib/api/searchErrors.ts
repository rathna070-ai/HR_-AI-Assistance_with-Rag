import axios from "axios";
import type { ApiError } from "@/types/api.types";

// A failed search or summary, as shown in the chat thread.
export interface SearchError {
  title: string;
  message: string;
  // False when trying again with the same input cannot help.
  retryable: boolean;
}

const BY_ERROR_CODE: Record<string, Omit<SearchError, "message"> & { message?: string }> = {
  INVALID_SEARCH_QUERY: { title: "Check your query", retryable: false },
  INVALID_OPTIONS: { title: "Invalid search settings", retryable: false },
  INVALID_TOP_K: { title: "Invalid number of results", retryable: false },
  INVALID_CANDIDATES: { title: "These candidates are no longer available", retryable: false },
  SEARCH_UNAVAILABLE: {
    title: "Search is temporarily unavailable",
    message: "Neither keyword nor semantic search could run. Try again in a moment.",
    retryable: true,
  },
  EMBEDDING_FAILED: {
    title: "Semantic search failed",
    message: "The query could not be converted for semantic search. Try again, or use BM25 Keyword mode.",
    retryable: true,
  },
  SUMMARIZATION_FAILED: {
    title: "Summary unavailable",
    message: "The AI could not summarize these candidates right now.",
    retryable: true,
  },
  LLM_RERANK_FAILED: { title: "AI re-ranking failed", message: "The AI could not rank these candidates right now.", retryable: true },
  DATABASE_ERROR: { title: "Database error", message: "The resume database could not be reached. Try again in a moment.", retryable: true },
};

// Turns any search or summary failure into a message for the user. A request
// with no response is a network problem, never a search error.
export const toSearchError = (err: unknown): SearchError => {
  if (axios.isAxiosError<ApiError>(err)) {
    if (!err.response) {
      return err.code === "ECONNABORTED"
        ? { title: "The search took too long", message: "The server did not respond in time. Try again.", retryable: true }
        : { title: "Can't reach the server", message: "Check your connection and that the backend is running.", retryable: true };
    }
    const { status, data } = err.response;
    const known = data?.errorCode ? BY_ERROR_CODE[data.errorCode] : undefined;
    if (known) return { title: known.title, message: known.message ?? data?.message ?? "", retryable: known.retryable };
    if (status >= 500) return { title: "Server error", message: "Something went wrong on the server. Try again.", retryable: true };
    return { title: "Search failed", message: data?.message ?? `HTTP ${status}`, retryable: status === 429 };
  }
  return { title: "Search failed", message: err instanceof Error ? err.message : "Unexpected error", retryable: true };
};
