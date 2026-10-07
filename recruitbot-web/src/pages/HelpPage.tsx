import { ArrowLeft, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandWordmark } from "@/components/common/BrandAvatar";
import { MODE_ICONS } from "@/lib/utils/constants";

// In-app guide: how to use TalentLens AI and how ingestion and search work.
// Linked from the sidebar footer.

const QUICK_START: { title: string; body: ReactNode }[] = [
  {
    title: "Upload resumes",
    body: (
      <>
        Open <strong>Upload resumes</strong> in the sidebar, choose a PDF (up to 5 MB) and click <strong>Upload</strong>. The progress list
        shows each processing stage. Uploading the same file again is recognised as already ingested.
      </>
    ),
  },
  {
    title: "Pick a search mode",
    body: (
      <>
        <strong>AI Search</strong> is selected by default. You can also choose <strong>Vector</strong>, <strong>BM25 Keyword</strong> or{" "}
        <strong>Hybrid</strong> in the sidebar. The active mode is shown in blue at the top right.
      </>
    ),
  },
  {
    title: "Describe the candidate",
    body: (
      <>
        Type what you need, for example &ldquo;Selenium tester with 3 years of experience&rdquo;, and press <strong>Enter</strong>{" "}
        (Shift+Enter adds a new line). On an empty chat you can also click one of the suggestions.
      </>
    ),
  },
  {
    title: "Review the results",
    body: (
      <>
        Candidates are ranked best first, with their score, years of experience and contact details. In AI Search each card also says{" "}
        <strong>why it matches</strong>, highlights the skills from your query, and gets a short fit summary, with an AI summary of the
        whole shortlist on top. A person with more than one resume on file is shown once, marked &ldquo;+1 more resume&rdquo;. Change how
        many are returned with <strong>Results limit</strong> (3, 5, 10 or 20).
      </>
    ),
  },
  {
    title: "Open a profile",
    body: (
      <>
        Click a result to see contact details, skills, experience and education. Press <strong>Esc</strong> or the close button to return.
      </>
    ),
  },
  {
    title: "Start over",
    body: (
      <>
        <strong>Clear</strong>, next to the send button, empties the chat.
      </>
    ),
  },
];

const MODES = [
  {
    mode: "ai" as const,
    name: "AI Search",
    bestFor:
      "Most searches. Runs keyword and semantic search together, removes repeated resumes of the same person, lets the AI rank the best candidates with a reason for each, and summarizes the shortlist.",
    score: "Relevance, 0 to 1, given by the AI",
  },
  {
    mode: "vector" as const,
    name: "Vector",
    bestFor: "Describing a candidate in your own words. Finds resumes with a similar meaning even when they use different terms.",
    score: "Similarity, 0 to 1 (higher is closer)",
  },
  {
    mode: "bm25" as const,
    name: "BM25 Keyword",
    bestFor: "Exact terms such as tool names, certifications or job titles (Selenium, Cypress, AWS).",
    score: "BM25 score (higher is better, no fixed maximum)",
  },
  {
    mode: "hybrid" as const,
    name: "Hybrid",
    bestFor: "Combining both. Use the BM25 and Vector sliders, or a preset, to choose how much each one counts.",
    score: "Hybrid score, 0 to 1",
  },
];

const INGESTION_STEPS = [
  ["Upload", "The PDF is sent to the server (PDF only, 5 MB maximum)."],
  [
    "Duplicate check",
    "A fingerprint (SHA-256) of the file is compared with resumes already stored. A file that was already ingested stops here and is reported as already ingested.",
  ],
  ["Text extraction", "The text is read from the PDF and cleaned."],
  [
    "Parsing",
    "A Groq-hosted language model reads the text and extracts name, contact details, skills, current role and company, education, total experience, job titles and a short summary. (If the server has the LLM parser turned off, a rule-based parser is used instead.)",
  ],
  ["Embedding", "Mistral's mistral-embed model turns the resume into a vector that captures its meaning."],
  ["Storage", "The resume, its extracted fields and its vector are saved in MongoDB Atlas, ready to search."],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}

export function HelpPage() {
  return (
    <div className="h-full overflow-y-auto bg-bg-base">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <BrandWordmark height={36} />
            <h1 className="mt-4 text-2xl font-semibold text-navy">How to use TalentLens AI</h1>
            <p className="mt-1 text-sm text-text-muted">Upload resumes, then find the right candidates by describing who you need.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to search
            </Link>
            <Link
              to="/ingestion"
              className="flex items-center gap-1.5 rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text-primary transition-colors hover:bg-slate-100"
            >
              <Upload className="h-4 w-4" aria-hidden />
              Upload resumes
            </Link>
          </div>
        </header>

        <Section title="Quick start">
          <ol className="flex flex-col gap-4">
            {QUICK_START.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">{step.title}</p>
                  <p className="mt-0.5 leading-6 text-text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Search modes">
          <ul className="flex flex-col gap-3">
            {MODES.map(({ mode, name, bestFor, score }) => {
              const Icon = MODE_ICONS[mode];
              return (
                <li key={mode} className="flex gap-3 rounded-xl border border-line bg-bg-base p-4 text-sm">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-semibold text-text-primary">{name}</p>
                    <p className="mt-0.5 leading-6 text-text-muted">{bestFor}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      <span className="font-medium text-text-primary">Score shown:</span> {score}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="How it works">
          <div className="text-sm">
            <h3 className="font-semibold text-text-primary">When you upload a resume</h3>
            <ol className="mt-3 flex flex-col gap-2 border-l-2 border-primary/20 pl-4">
              {INGESTION_STEPS.map(([name, text]) => (
                <li key={name} className="leading-6 text-text-muted">
                  <span className="font-medium text-text-primary">{name}:</span> {text}
                </li>
              ))}
            </ol>
          </div>
          <div className="text-sm">
            <h3 className="font-semibold text-text-primary">When you search</h3>
            <ul className="mt-3 flex flex-col gap-2 border-l-2 border-primary/20 pl-4 leading-6 text-text-muted">
              <li>
                <span className="font-medium text-text-primary">AI Search:</span> BM25 and vector search run at the same time. Their results
                are merged into one list; a resume found by both counts once. Resumes of the same person (same email or phone, or the same
                name when neither is on the resume) are combined, keeping the best-ranked one. The top candidates (at least 10) are then
                ranked by a Groq-hosted language model, which scores each one from 0 to 1 and explains the match using only the resume data.
                Finally a second AI request summarizes the shortlist and each candidate&apos;s fit. If AI ranking is unavailable, results
                stay in search-score order and a notice says so.
              </li>
              <li>
                <span className="font-medium text-text-primary">Vector:</span> your query is turned into a vector with the same Mistral
                model and compared with every resume&apos;s vector using MongoDB Atlas Vector Search (cosine similarity).
              </li>
              <li>
                <span className="font-medium text-text-primary">BM25 Keyword:</span> MongoDB Atlas Search runs a full-text search over the
                resume text, skills, job titles, experience summary, role and company, and ranks matches with BM25.
              </li>
              <li>
                <span className="font-medium text-text-primary">Hybrid:</span> both searches run. Each list&apos;s scores are rescaled to
                0&ndash;1 and combined using your BM25 and Vector weights; a resume found by only one search scores 0 for the other.
              </li>
            </ul>
          </div>
        </Section>

        <Section title="Tips">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6 text-text-muted">
            <li>Use exact tool and technology names with BM25 Keyword.</li>
            <li>Use full sentences that describe the role with Vector.</li>
            <li>Not sure which to use? Start with AI Search; compare with Hybrid at 50/50 to see the raw search ranking.</li>
            <li>Queries can be up to 1,000 characters.</li>
            <li>
              A profile only shows what was found in the resume. A missing section means the resume did not contain it or it could not be
              read.
            </li>
          </ul>
        </Section>
      </main>
    </div>
  );
}
