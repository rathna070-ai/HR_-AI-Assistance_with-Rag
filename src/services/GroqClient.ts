const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export class GroqRequestError extends Error {
  constructor(detail: string) {
    super("Groq request failed");
    this.cause = detail;
  }
}

export interface GroqRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  // Waits longer than this (e.g. a daily limit) are not retried.
  maxRetryWaitMs: number;
  timeoutMs: number;
}

// GROQ_API_KEY first; GROQ_API_KEY_FALLBACK is used when it is rate-limited
// or rejected.
const apiKeys = (): { label: string; key: string }[] =>
  [
    { label: "primary", key: process.env.GROQ_API_KEY },
    { label: "fallback", key: process.env.GROQ_API_KEY_FALLBACK },
  ].filter((k): k is { label: string; key: string } => Boolean(k.key));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Sends one chat completion and returns the message content. On 429 it moves
// to the next key at once; when every key is limited it waits (Retry-After or
// exponential backoff) and tries again, up to policy.maxAttempts rounds.
export const groqChat = async (payload: Record<string, unknown>, policy: GroqRetryPolicy): Promise<string | undefined> => {
  const keys = apiKeys();
  if (!keys.length) throw new GroqRequestError("GROQ_API_KEY is not set");

  let lastError = "";
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    let waitMs = policy.baseDelayMs * 2 ** (attempt - 1);
    let retryAfterMs = Infinity;

    for (const [i, { label, key }] of keys.entries()) {
      try {
        const response = await fetch(GROQ_CHAT_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(policy.timeoutMs),
        });
        if (response.ok) {
          const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
          return body.choices?.[0]?.message?.content;
        }

        lastError = `Groq API ${response.status}: ${await response.text()}`;
        if (response.status === 429) {
          const seconds = Number(response.headers.get("retry-after"));
          if (seconds > 0) retryAfterMs = Math.min(retryAfterMs, seconds * 1000);
          if (i < keys.length - 1) console.warn(JSON.stringify({ component: "groq", event: "rate_limited", key: label, next: keys[i + 1].label }));
          continue;
        }
        // 5xx is not key-specific: retry the round. Other 4xx (e.g. a revoked
        // key) may be specific to this key, so try the next one.
        if (response.status >= 500) break;
        if (i === keys.length - 1) throw new GroqRequestError(lastError);
      } catch (err) {
        if (err instanceof GroqRequestError) throw err;
        lastError = (err as Error).message;
        break;
      }
    }

    if (Number.isFinite(retryAfterMs)) waitMs = retryAfterMs + 500;
    if (waitMs > policy.maxRetryWaitMs || attempt === policy.maxAttempts) break;
    await sleep(waitMs);
  }
  throw new GroqRequestError(lastError);
};
