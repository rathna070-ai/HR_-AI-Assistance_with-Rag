import {
  CandidateSummary,
  RerankOutput,
  RerankResult,
  ResumeMetadata,
  SearchCandidate,
  SummaryOptions,
} from "../types/retrieval.types";

import { groqChat, GroqRetryPolicy } from "../../../services/GroqClient";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
// Searches are synchronous: one short retry, then the caller falls back.
const RETRY_POLICY: GroqRetryPolicy = { maxAttempts: 2, baseDelayMs: 1_000, maxRetryWaitMs: 5_000, timeoutMs: 30_000 };
const MAX_METADATA_INPUT_CHARS = 20_000;
// gpt-oss reasons before it answers, and reasoning tokens count toward the
// completion limit, so summaries get this much room on top of maxTokens.
const REASONING_HEADROOM_TOKENS = 1_024;

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = { style: "short", maxTokens: 150 };

export type LLMErrorCode = "LLM_RERANK_FAILED" | "SUMMARIZATION_FAILED" | "METADATA_EXTRACTION_FAILED";

const ERROR_MESSAGES: Record<LLMErrorCode, string> = {
  LLM_RERANK_FAILED: "LLM re-ranking failed",
  SUMMARIZATION_FAILED: "Candidate summarization failed",
  METADATA_EXTRACTION_FAILED: "LLM metadata extraction failed",
};

export class LLMServiceError extends Error {
  constructor(
    readonly errorCode: LLMErrorCode,
    detail?: string,
  ) {
    super(ERROR_MESSAGES[errorCode]);
    if (detail) this.cause = detail;
  }
}

const RERANK_PROMPT = `You rank resume candidates for a recruiter's search query.
Use only the candidate data provided. Do not assume skills or experience that are not stated.
Reply with one JSON object and nothing else:
{
  "results": [
    { "resumeId": string, "relevanceScore": number, "reason": string }
  ]
}
- Order results from best to worst match.
- relevanceScore is between 0 and 1.
- reason is one sentence explaining the match, based only on the candidate data, without gendered pronouns.
- Judge only skills, roles and experience; never use name, gender, age or other personal traits.
- Use only resumeId values from the input. Include each candidate at most once. Never invent candidates.`;

const SUMMARY_LIMITS = {
  short: "2 to 3 sentences",
  detailed: "one paragraph covering strengths, relevant experience and gaps",
};

const summaryPrompt = ({ style, maxTokens }: SummaryOptions) => `You summarize how well a candidate fits a recruiter's search query.
Use only the candidate data provided. Never add skills, employers or experience that are not stated.
Refer to the candidate by name or as "the candidate", never with gendered pronouns, and do not infer gender, age or other personal traits.
Write ${SUMMARY_LIMITS[style]}, at most ${Math.floor(maxTokens * 0.75)} words, as plain text without headings or lists.`;

const METADATA_PROMPT = `You extract search metadata from resume text.
Reply with one JSON object and nothing else, using exactly these keys:
{
  "jobTitles": string[],              // job titles held, most recent first
  "skills": string[],                 // technical and professional skills, canonical spelling
  "totalExperience": number | null,   // total years of work experience, one decimal place
  "experienceSummary": string | null  // 1 to 2 sentences summarizing the work experience
}
Use null (or []) when the resume does not contain the value. Never guess.`;

const asStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim()))]
    : [];

const asText = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

// What the re-ranker and summarizer see of a candidate.
const candidateForPrompt = (c: SearchCandidate) => ({
  resumeId: c.resumeId,
  name: c.name ?? null,
  role: c.role ?? null,
  company: c.company ?? null,
  skills: c.skills ?? [],
  snippet: c.snippet ?? "",
});

interface ChatOptions {
  json: boolean;
  maxCompletionTokens?: number;
}

// Retrieval Phase 10: Groq LLM re-ranking, summaries and metadata extraction.
export class LLMService {
  constructor(readonly model = process.env.GROQ_MODEL || DEFAULT_MODEL) {}

  private async chat(system: string, user: string, errorCode: LLMErrorCode, { json, maxCompletionTokens }: ChatOptions): Promise<string> {
    let content: string | undefined;
    try {
      content = (
        await groqChat(
          {
            model: this.model,
            temperature: 0,
            ...(json && { response_format: { type: "json_object" } }),
            // Low reasoning keeps synchronous searches fast (P95 target 3-5 s).
            reasoning_effort: "low",
            ...(maxCompletionTokens && { max_completion_tokens: maxCompletionTokens }),
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          },
          RETRY_POLICY,
        )
      )?.trim();
    } catch (err) {
      throw new LLMServiceError(errorCode, String((err as Error).cause ?? (err as Error).message));
    }
    if (!content) throw new LLMServiceError(errorCode, "Empty response from model");
    return content;
  }

  private async chatJson(system: string, user: string, errorCode: LLMErrorCode): Promise<Record<string, unknown>> {
    const content = await this.chat(system, user, errorCode, { json: true });
    try {
      const data: unknown = JSON.parse(content);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not a JSON object");
      return data as Record<string, unknown>;
    } catch (err) {
      throw new LLMServiceError(errorCode, `Invalid JSON from model: ${(err as Error).message}`);
    }
  }

  // Ranks the given candidates and returns at most topK of them. Only resume
  // ids from the input are accepted; anything else from the model is dropped.
  async rerankCandidates(
    query: string,
    candidates: SearchCandidate[],
    topK = Number(process.env.RERANK_DEFAULT_TOP_N) || 10,
  ): Promise<RerankOutput> {
    if (!candidates.length) return { results: [], model: this.model };

    const data = await this.chatJson(
      RERANK_PROMPT,
      JSON.stringify({ query, candidates: candidates.map(candidateForPrompt) }),
      "LLM_RERANK_FAILED",
    );
    if (!Array.isArray(data.results)) throw new LLMServiceError("LLM_RERANK_FAILED", "Model output has no results array");

    const inputIds = new Set(candidates.map((c) => c.resumeId));
    const seen = new Set<string>();
    const ranked: Omit<RerankResult, "rank">[] = [];
    for (const item of data.results as Record<string, unknown>[]) {
      const resumeId = item?.resumeId;
      if (typeof resumeId !== "string" || !inputIds.has(resumeId) || seen.has(resumeId)) {
        console.warn(JSON.stringify({ component: "LLMService.rerank", droppedResumeId: resumeId ?? null }));
        continue;
      }
      const score = Number(item.relevanceScore);
      if (!Number.isFinite(score)) throw new LLMServiceError("LLM_RERANK_FAILED", `Invalid relevanceScore for ${resumeId}`);
      seen.add(resumeId);
      ranked.push({ resumeId, relevanceScore: Math.min(1, Math.max(0, score)), reason: asText(item.reason) ?? "" });
    }
    if (!ranked.length) throw new LLMServiceError("LLM_RERANK_FAILED", "Model returned no valid candidates");

    // Stable sort keeps the model's order for equal scores.
    const results = ranked
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return { results, model: this.model };
  }

  async summarizeCandidateFit(
    query: string,
    candidate: SearchCandidate,
    options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS,
  ): Promise<CandidateSummary> {
    const summary = await this.chat(
      summaryPrompt(options),
      JSON.stringify({ query, candidate: candidateForPrompt(candidate) }),
      "SUMMARIZATION_FAILED",
      { json: false, maxCompletionTokens: options.maxTokens + REASONING_HEADROOM_TOKENS },
    );
    return { resumeId: candidate.resumeId, summary };
  }

  // Query-time metadata normalization. Stored ingestion metadata remains the
  // source used by retrieval.
  async extractMetadata(rawText: string): Promise<ResumeMetadata> {
    const data = await this.chatJson(METADATA_PROMPT, rawText.slice(0, MAX_METADATA_INPUT_CHARS), "METADATA_EXTRACTION_FAILED");
    const years = typeof data.totalExperience === "string" ? Number.parseFloat(data.totalExperience) : data.totalExperience;
    return {
      jobTitles: asStringList(data.jobTitles),
      skills: asStringList(data.skills),
      totalExperience: typeof years === "number" && Number.isFinite(years) && years >= 0 ? Math.round(years * 10) / 10 : null,
      experienceSummary: asText(data.experienceSummary),
    };
  }
}

export const llmService = new LLMService();
