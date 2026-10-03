export interface ParsedResume {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  company: string | null;
  role: string | null;
  education: string | null;
  totalExperience: number | null;
  // Retrieval contract fields (searched by BM25).
  jobTitles: string[];
  experienceSummary: string | null;
  // In the retrieval contract; no parser fills it yet, so it is always null.
  relevantExperience: number | null;
}

export interface ResumeParser {
  parseResume(rawText: string): Promise<ParsedResume>;
}
