import { Document } from "mongodb";
import { escapeRegex } from "../../../utils/regex";
import { Bm25Result, CandidateSource, HybridListItem, SearchCandidate, VectorResult } from "../types/retrieval.types";

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

// A skill counts as matched when its name, without any "(...)" part, appears
// in the query as a whole word: "MCP (Model Context Protocol)" matches "MCP",
// and "Java" does not match "JavaScript".
export const matchSkills = (skills: unknown, query: string): string[] => {
  if (!Array.isArray(skills)) return [];
  return skills.filter((skill): skill is string => {
    if (typeof skill !== "string") return false;
    const name = skill.replace(/\(.*?\)/g, "").trim();
    return name.length > 0 && new RegExp(String.raw`(?<![\p{L}\p{N}])${escapeRegex(name)}(?![\p{L}\p{N}])`, "iu").test(query);
  });
};

// Phase 7: a search hit from MongoDB as a normalized candidate.
export const toCandidate = (doc: Document, source: CandidateSource): SearchCandidate => ({
  resumeId: doc._id.toHexString(),
  ...(doc.name && { name: doc.name }),
  ...(doc.role && { role: doc.role }),
  ...(doc.company && { company: doc.company }),
  skills: Array.isArray(doc.skills) ? doc.skills : [],
  totalExperience: typeof doc.totalExperience === "number" ? doc.totalExperience : null,
  ...(doc.snippet && { snippet: String(doc.snippet).replace(/\s+/g, " ").trim() }),
  ...(source === "bm25" ? { bm25Score: round(doc.score, 2) } : { vectorScore: round(doc.score, 4) }),
  sources: [source],
});

export const toBm25Result = (candidate: SearchCandidate, query: string): Bm25Result => ({
  resumeId: candidate.resumeId,
  name: candidate.name ?? null,
  role: candidate.role ?? null,
  score: candidate.bm25Score ?? 0,
  matchedSkills: matchSkills(candidate.skills, query),
});

export const toVectorResult = (candidate: SearchCandidate): VectorResult => ({
  resumeId: candidate.resumeId,
  name: candidate.name ?? null,
  role: candidate.role ?? null,
  vectorScore: candidate.vectorScore ?? 0,
});

export const toHybridItem = (candidate: SearchCandidate): HybridListItem => ({
  resumeId: candidate.resumeId,
  name: candidate.name ?? null,
  score: candidate.bm25Score ?? candidate.vectorScore ?? 0,
});
