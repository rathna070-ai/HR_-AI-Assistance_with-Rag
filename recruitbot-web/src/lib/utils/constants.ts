import { Blend, KeyRound, Sparkles } from "lucide-react";
import type { SearchMode } from "@/types/search.types";

export const SEARCH_MODES: Record<SearchMode, { label: string; badge: string; description: string; scoreLabel: string }> = {
  vector: { label: "Vector Search", badge: "Vector", description: "Semantic similarity", scoreLabel: "Similarity" },
  bm25: { label: "BM25 Keyword", badge: "BM25", description: "Exact keyword match", scoreLabel: "BM25 Score" },
  hybrid: { label: "Hybrid", badge: "Hybrid", description: "Keywords + meaning", scoreLabel: "Hybrid" },
};

export const MODE_ICONS: Record<SearchMode, typeof Sparkles> = { vector: Sparkles, bm25: KeyRound, hybrid: Blend };

export const TOP_K_OPTIONS = [3, 5, 10, 20];

export const WEIGHT_PRESETS: { bm25: number; vector: number }[] = [
  { bm25: 50, vector: 50 },
  { bm25: 70, vector: 30 },
  { bm25: 30, vector: 70 },
];

export const SUGGESTIONS = [
  { emoji: "🔍", label: "Selenium QA 3 yrs", query: "Selenium automation engineer 3 years" },
  { emoji: "🐍", label: "Python ML dev", query: "Python developer with machine learning" },
  { emoji: "☁️", label: "Java AWS backend", query: "Java backend developer AWS cloud" },
  { emoji: "⚡", label: "Lead QA Cypress", query: "Lead QA engineer with Cypress and CI/CD" },
];

export const SNIPPET_LENGTH = 200;
