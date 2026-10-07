import { useEffect, useState } from "react";
import { searchApi } from "@/lib/api/search.api";
import { toSearchError, type SearchError } from "@/lib/api/searchErrors";
import type { ShortlistSummary } from "@/types/search.types";

export type ShortlistSummaryState =
  { status: "loading" } | { status: "done"; data: ShortlistSummary } | { status: "error"; error: SearchError };

// Requests in flight, so React's StrictMode double effect (development) does
// not send a second LLM request for the same list.
const inFlight = new Map<string, Promise<ShortlistSummary>>();

const load = (key: string, query: string, resumeIds: string[]): Promise<ShortlistSummary> => {
  let request = inFlight.get(key);
  if (!request) {
    request = searchApi.getShortlistSummary(query, resumeIds);
    inFlight.set(key, request);
    const forget = () => inFlight.delete(key);
    request.then(forget, forget);
  }
  return request;
};

// Loads the overall and per-candidate summaries of one AI Search result list,
// after the results are already on screen. retry() asks again after a failure.
export function useShortlistSummary(query: string, resumeIds: string[]) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ShortlistSummaryState>(
    resumeIds.length ? { status: "loading" } : { status: "done", data: { overall: "", results: [] } },
  );
  const key = `${attempt}|${query}|${resumeIds.join(",")}`;

  useEffect(() => {
    if (!resumeIds.length) return;
    let active = true;
    load(key, query, resumeIds).then(
      (data) => active && setState({ status: "done", data }),
      (err: unknown) => active && setState({ status: "error", error: toSearchError(err) }),
    );
    return () => {
      active = false;
    };
    // key covers query, resumeIds and attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((a) => a + 1);
  };

  return { state, retry };
}
