import { AlertTriangle, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { Fragment, useMemo } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { useCandidateModal } from "@/hooks/use-candidate-modal";
import { useShortlistSummary, type ShortlistSummaryState } from "@/hooks/use-shortlist-summary";
import type { AiSearchResponse } from "@/types/search.types";
import { AiResultCard, type CardSummary } from "./AiResultCard";
import { ResultSummary } from "./ResultSummary";

// What each pipeline step produced, e.g. "40 retrieved > 37 unique resumes >
// 3 duplicates merged > top 10 re-ranked by AI > 5 shown".
function PipelineSteps({ response }: { response: AiSearchResponse }) {
  const { retrieved, uniqueResumes, duplicatesMerged, reranked, returned } = response.pipeline;
  const steps = [
    { label: `${retrieved.bm25 + retrieved.vector} retrieved`, title: `BM25 ${retrieved.bm25} · Semantic ${retrieved.vector}` },
    { label: `${uniqueResumes} unique ${uniqueResumes === 1 ? "resume" : "resumes"}` },
    ...(duplicatesMerged > 0
      ? [
          {
            label: `${duplicatesMerged} duplicate ${duplicatesMerged === 1 ? "resume" : "resumes"} merged`,
            title: "Same person, more than one resume",
          },
        ]
      : []),
    { label: reranked > 0 ? `top ${reranked} re-ranked by AI` : "AI re-ranking skipped" },
    { label: `${returned} shown` },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs text-text-muted" aria-label="Search pipeline" data-testid="pipeline-summary">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />}
          <li className="rounded-full bg-slate-100 px-2 py-0.5" title={step.title}>
            {step.label}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

function Warnings({ response }: { response: AiSearchResponse }) {
  const messages = [
    response.warnings.includes("LLM_RERANK_FAILED") &&
      "AI re-ranking is unavailable right now, so results are in search-score order without match reasons.",
    response.vectorFallback && "Semantic search was unavailable; showing keyword (BM25) matches only.",
    response.bm25Fallback && "Keyword search was unavailable; showing semantic matches only.",
  ].filter((m): m is string => typeof m === "string");
  if (!messages.length) return null;
  return (
    <div
      className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
      data-testid="search-warning"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <ul className="flex flex-col gap-1">
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

function ShortlistSummaryCard({ state, onRetry }: { state: ShortlistSummaryState; onRetry: () => void }) {
  return (
    <section
      className="rounded-xl border border-score-ai/20 bg-score-ai/5 p-4"
      aria-label="AI summary of these candidates"
      data-testid="shortlist-summary"
      data-state={state.status}
    >
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-score-ai-ink">
        <Sparkles className="h-4 w-4" aria-hidden /> AI summary
      </h3>
      {state.status === "loading" && (
        <div className="mt-2 flex flex-col gap-1.5" role="status">
          <span className="sr-only">Summarizing these candidates</span>
          <span className="h-3 w-full animate-pulse rounded bg-score-ai/15" />
          <span className="h-3 w-11/12 animate-pulse rounded bg-score-ai/15" />
          <span className="h-3 w-2/3 animate-pulse rounded bg-score-ai/15" />
        </div>
      )}
      {state.status === "done" && <p className="mt-2 text-sm leading-6 text-text-primary">{state.data.overall}</p>}
      {state.status === "error" && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <p className="text-text-muted">
            <span className="font-medium text-red-700">{state.error.title}.</span> {state.error.message}
          </p>
          {state.error.retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Retry summary
            </button>
          )}
        </div>
      )}
    </section>
  );
}

const cardSummary = (state: ShortlistSummaryState, candidateId: string): CardSummary => {
  if (state.status === "loading") return { status: "loading" };
  if (state.status === "error") return { status: "error" };
  return { status: "done", text: state.data.results.find((r) => r.resumeId === candidateId)?.summary ?? null };
};

// AI Search results: pipeline, warnings, overall summary, then the ranked
// candidates. Summaries load after the results are shown.
export function AiResultsList({ response }: { response: AiSearchResponse }) {
  const { openCandidateModal } = useCandidateModal();
  const ids = useMemo(() => response.results.map((r) => r.candidateId), [response.results]);
  const { state, retry } = useShortlistSummary(response.query, ids);

  return (
    <div className="flex flex-col gap-3" data-testid="results-list" data-mode="ai" data-query={response.query}>
      <ResultSummary count={response.results.length} searchType="ai" duration={response.duration} />
      <PipelineSteps response={response} />
      <Warnings response={response} />
      {response.results.length === 0 ? (
        <EmptyState text="Try describing the role differently, or use fewer requirements." />
      ) : (
        <>
          <ShortlistSummaryCard state={state} onRetry={retry} />
          {response.results.map((result, i) => (
            <AiResultCard
              key={result.candidateId}
              result={result}
              summary={cardSummary(state, result.candidateId)}
              onSelect={openCandidateModal}
              index={i}
            />
          ))}
        </>
      )}
    </div>
  );
}
