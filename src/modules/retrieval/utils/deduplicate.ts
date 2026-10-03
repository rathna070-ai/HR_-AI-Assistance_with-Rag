import { SearchCandidate } from "../types/retrieval.types";

// Snippet length sent to the LLM re-ranker per candidate.
export const MAX_SNIPPET_CHARS = 600;

const limitSnippet = (snippet?: string) =>
  snippet && snippet.length > MAX_SNIPPET_CHARS ? `${snippet.slice(0, MAX_SNIPPET_CHARS)}...` : snippet;

// Retrieval Phase 9: one candidate pool, deduplicated by resumeId. Order is
// the first list, then new candidates from the next list (BM25 A,B,C +
// vector B,D,A -> A,B,C,D). Scores and sources of repeats are merged.
export const mergeCandidates = (...lists: SearchCandidate[][]): SearchCandidate[] => {
  const pool = new Map<string, SearchCandidate>();

  for (const list of lists) {
    for (const candidate of list) {
      const existing = pool.get(candidate.resumeId);
      if (!existing) {
        pool.set(candidate.resumeId, { ...candidate, snippet: limitSnippet(candidate.snippet), sources: [...candidate.sources] });
        continue;
      }
      existing.bm25Score ??= candidate.bm25Score;
      existing.vectorScore ??= candidate.vectorScore;
      existing.name ??= candidate.name;
      existing.role ??= candidate.role;
      existing.company ??= candidate.company;
      existing.snippet ??= limitSnippet(candidate.snippet);
      if (!existing.skills?.length) existing.skills = candidate.skills;
      for (const source of candidate.sources) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
      }
    }
  }

  return [...pool.values()];
};
