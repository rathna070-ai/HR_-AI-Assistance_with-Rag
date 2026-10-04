// Error body of the backend: { success: false, message } (retrieval adds errorCode).
export interface ApiError {
  success: false;
  message: string;
  errorCode?: string;
}

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

// ---- Response shapes of the existing backend endpoints ----

// POST /v1/search/bm25
export interface BackendBm25Response {
  mode: "bm25";
  query: string;
  count: number;
  results: { resumeId: string; name: string | null; role: string | null; score: number; matchedSkills: string[] }[];
}

// POST /v1/search/vector
export interface BackendVectorResponse {
  mode: "vector";
  count: number;
  results: { resumeId: string; name: string | null; role: string | null; vectorScore: number }[];
}

// POST /v1/search/hybrid (both lists, scores not merged)
export interface BackendHybridResponse {
  mode: "hybrid-debug";
  bm25: { resumeId: string; name: string | null; score: number }[];
  vector: { resumeId: string; name: string | null; score: number }[];
  degraded: boolean;
  timings: { bm25Ms: number; embeddingMs: number; vectorMs: number };
}

// GET /v1/resumes/:id -> data
export interface BackendResume {
  id: string;
  fileName: string;
  rawText: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  company: string | null;
  role: string | null;
  education: string | null;
  totalExperience: number | null;
  jobTitles?: string[];
  experienceSummary?: string | null;
  ingestedAt?: string;
}
