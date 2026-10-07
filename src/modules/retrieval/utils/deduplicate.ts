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
      existing.email ??= candidate.email;
      existing.phone ??= candidate.phone;
      existing.fileName ??= candidate.fileName;
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

const emailKey = (email?: string) => {
  const value = email?.trim().toLowerCase();
  return value ? `email:${value}` : null;
};

// Last 10 digits, so "+91 98765 43210" and "9876543210" match.
const phoneKey = (phone?: string) => {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 10 ? `phone:${digits.slice(-10)}` : null;
};

const nameKey = (name?: string) => {
  const value = name?.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return value ? `name:${value}` : null;
};

// One result per person. Several stored resumes of the same person (an
// updated CV, a one-page version) are matched by email or phone; a name alone
// counts only when the resume has neither, so two different people with the
// same name stay separate. The first (best-ranked) resume is kept, its scores
// become the best of the group and the others are listed in `duplicates`.
export const dedupeByPerson = (candidates: SearchCandidate[]): SearchCandidate[] => {
  const kept: SearchCandidate[] = [];
  const byKey = new Map<string, SearchCandidate>();

  for (const candidate of candidates) {
    const contactKeys = [emailKey(candidate.email), phoneKey(candidate.phone)].filter((k): k is string => k !== null);
    const keys = contactKeys.length ? contactKeys : [nameKey(candidate.name)].filter((k): k is string => k !== null);
    const person = keys.map((k) => byKey.get(k)).find((p) => p !== undefined);

    if (!person) {
      const entry = { ...candidate, sources: [...candidate.sources], duplicates: [...(candidate.duplicates ?? [])] };
      kept.push(entry);
      for (const key of keys) byKey.set(key, entry);
      continue;
    }

    person.duplicates!.push({ resumeId: candidate.resumeId, fileName: candidate.fileName ?? null });
    if (candidate.bm25Score !== undefined) person.bm25Score = Math.max(person.bm25Score ?? candidate.bm25Score, candidate.bm25Score);
    if (candidate.vectorScore !== undefined) {
      person.vectorScore = Math.max(person.vectorScore ?? candidate.vectorScore, candidate.vectorScore);
    }
    for (const source of candidate.sources) {
      if (!person.sources.includes(source)) person.sources.push(source);
    }
    // The duplicate's other identifiers lead to the same person too.
    for (const key of keys) if (!byKey.has(key)) byKey.set(key, person);
  }

  return kept;
};
