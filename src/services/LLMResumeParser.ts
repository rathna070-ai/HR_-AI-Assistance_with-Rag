import { ParsedResume, ResumeParser } from "../types/resume";
import { detectSkills } from "../utils/skillDetector";
import { groqChat, GroqRetryPolicy } from "./GroqClient";

const DEFAULT_MODEL = "openai/gpt-oss-120b";
// Resumes are rarely longer than this; the cap keeps the prompt inside the model's context.
const MAX_INPUT_CHARS = 20_000;
// Groq's free tier allows a few thousand tokens per minute, so 429s are expected
// during batch runs. Waits longer than 90 s mean a daily limit, which is not retried.
const RETRY_POLICY: GroqRetryPolicy = { maxAttempts: 6, baseDelayMs: 2_000, maxRetryWaitMs: 90_000, timeoutMs: 60_000 };

const SYSTEM_PROMPT = `You extract structured data from resume text.
Reply with one JSON object and nothing else, using exactly these keys:
{
  "isResume": boolean,              // false if the document is not a resume or CV (offer letter, job description, ID card, certificate)
  "name": string | null,            // the candidate's personal name from the resume header; never a tool, company, job title or section heading
  "email": string | null,
  "phone": string | null,           // digits only, without country code
  "location": string | null,        // current city only, e.g. "Chennai"
  "skills": string[],               // technical and professional skills, canonical spelling
  "company": string | null,         // current or most recent employer
  "role": string | null,            // current or most recent job title
  "jobTitles": string[],            // all job titles held, most recent first
  "education": string | null,       // highest degree with specialisation, e.g. "B.E Computer Science"
  "totalExperience": number | null, // total years of work experience, one decimal place; 0 for students and freshers with no work experience
  "experienceSummary": string | null // 1 to 2 sentences summarizing the work experience, using only facts from the resume
}
Use null (or [] for lists) when the resume does not contain the value. Never guess.
Write experienceSummary without gendered pronouns: use the candidate's name or "the candidate", and never infer gender, age or other personal traits.`;

// Bumped whenever the prompt changes, so stored resumes can be re-parsed.
export const LLM_PARSER_VERSION = 3;

export class LLMParseError extends Error {
  constructor(detail?: string) {
    super("LLM resume parsing failed");
    if (detail) this.cause = detail;
  }
}

export class NotAResumeError extends Error {
  constructor() {
    super("Not a resume");
  }
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asNumber = (value: unknown): number | null => {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null;
};

const asStringList = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.map(asString).filter((s): s is string => s !== null))] : [];

// Maps skills to the dictionary spelling ("selenium webdriver" -> "Selenium")
// so they match the algorithm parser and the search filters; skills the
// dictionary does not know (e.g. "RAG") are kept as written.
const canonicalSkills = (skills: string[]): string[] => [
  ...new Set(skills.flatMap((skill) => {
    const known = detectSkills(skill);
    return known.length ? known : [skill];
  })),
];

// The model is asked for this shape, but its output is still untrusted text.
export const toParsedResume = (data: Record<string, unknown>): ParsedResume => ({
  name: asString(data.name),
  email: asString(data.email)?.toLowerCase() ?? null,
  phone: asString(data.phone)?.replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "") || null,
  location: asString(data.location),
  skills: canonicalSkills(asStringList(data.skills)),
  company: asString(data.company),
  role: asString(data.role),
  education: asString(data.education),
  totalExperience: asNumber(data.totalExperience),
  jobTitles: asStringList(data.jobTitles),
  experienceSummary: asString(data.experienceSummary),
  relevantExperience: null,
});

export class LLMResumeParser implements ResumeParser {
  constructor(private readonly model = process.env.LLM_MODEL || DEFAULT_MODEL) {}

  async parseResume(rawText: string): Promise<ParsedResume> {
    let content: string | undefined;
    try {
      content = await groqChat(
        {
          model: this.model,
          temperature: 0,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
          messages: [
            // The model does not know today's date; without it "Present" is
            // resolved to an earlier year and experience comes out too low.
            {
              role: "system",
              content: `${SYSTEM_PROMPT}
Today's date is ${new Date().toISOString().slice(0, 10)}. Treat "Present", "Current" and "Till date" as today.`,
            },
            { role: "user", content: rawText.slice(0, MAX_INPUT_CHARS) },
          ],
        },
        RETRY_POLICY,
      );
    } catch (err) {
      throw new LLMParseError(String((err as Error).cause ?? (err as Error).message));
    }

    let data: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(content ?? "");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a JSON object");
      data = parsed as Record<string, unknown>;
    } catch (err) {
      throw new LLMParseError(`Invalid JSON from model: ${(err as Error).message}`);
    }
    if (data.isResume === false) throw new NotAResumeError();
    return toParsedResume(data);
  }
}

export const isLLMParserEnabled = () => process.env.USE_LLM_PARSER === "true";
