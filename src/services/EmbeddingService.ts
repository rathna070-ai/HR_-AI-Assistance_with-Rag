import { ParsedResume } from "../types/resume";

const MISTRAL_EMBEDDINGS_URL = "https://api.mistral.ai/v1/embeddings";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 2_000;
// mistral-embed accepts 8k tokens; ~24k characters of resume text stays under that.
const MAX_INPUT_CHARS = 24_000;

export class EmbeddingError extends Error {
  constructor(detail?: string) {
    super("Mistral embedding failed");
    if (detail) this.cause = detail;
  }
}

export interface EmbeddingResult {
  embedding: number[];
  embeddingModel: string;
  embeddingDimension: number;
}

export const buildEmbeddingText = (resume: ParsedResume, rawText: string): string =>
  [resume.name, resume.role, resume.jobTitles?.join(", "), resume.skills.join(","), resume.company, resume.experienceSummary, rawText]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_INPUT_CHARS);

export class EmbeddingService {
  constructor(
    private readonly apiKey = process.env.MISTRAL_API_KEY,
    private readonly model = process.env.MISTRAL_EMBED_MODEL || "mistral-embed",
    private readonly dimension = Number(process.env.EMBEDDING_DIMENSION) || 1024,
  ) {}

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new EmbeddingError("MISTRAL_API_KEY is not set");
    }

    const response = await this.requestWithRetry(text.slice(0, MAX_INPUT_CHARS));
    const body = (await response.json()) as { data?: { embedding?: number[] }[] };
    const embedding = body.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== this.dimension) {
      throw new EmbeddingError(
        `Expected a ${this.dimension}-dimension embedding, got ${Array.isArray(embedding) ? embedding.length : "none"}`,
      );
    }

    return { embedding, embeddingModel: this.model, embeddingDimension: this.dimension };
  }

  // Batch runs can hit Mistral's rate limit, so 429 / 5xx / network errors are
  // retried with exponential backoff (or the server's Retry-After).
  private async requestWithRetry(input: string): Promise<Response> {
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let retryAfterMs = RETRY_BASE_MS * 2 ** (attempt - 1);
      try {
        const response = await fetch(MISTRAL_EMBEDDINGS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: this.model, input: [input] }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.ok) return response;

        lastError = `Mistral API ${response.status}: ${await response.text()}`;
        if (response.status !== 429 && response.status < 500) break;
        const retryAfter = Number(response.headers.get("retry-after"));
        if (retryAfter > 0) retryAfterMs = retryAfter * 1000;
      } catch (err) {
        lastError = (err as Error).message;
      }
      if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    }
    throw new EmbeddingError(lastError);
  }
}

export const embeddingService = new EmbeddingService();
