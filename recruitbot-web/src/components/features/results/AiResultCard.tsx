import { m } from "framer-motion";
import { Briefcase, Copy, KeyRound, Mail, Phone, Sparkles } from "lucide-react";
import { formatYears } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import type { AiSearchResult } from "@/types/search.types";
import { RankBadge } from "./RankBadge";
import { ScorePill } from "./ScorePill";

// Fit summary of one card: loading, the text, or null when there is none.
export type CardSummary = { status: "loading" } | { status: "done"; text: string | null } | { status: "error" };

const MAX_SKILLS = 8;

interface AiResultCardProps {
  result: AiSearchResult;
  summary: CardSummary;
  onSelect: (candidateId: string) => void;
  index?: number;
}

function Score({ result }: { result: AiSearchResult }) {
  if (result.relevanceScore !== null) return <ScorePill score={result.relevanceScore} searchType="ai" />;
  // Re-ranking was unavailable: show the retrieval score instead.
  if (result.bm25Score !== null) return <ScorePill score={result.bm25Score} searchType="bm25" />;
  if (result.vectorScore !== null) return <ScorePill score={result.vectorScore} searchType="vector" />;
  return null;
}

function Summary({ summary }: { summary: CardSummary }) {
  if (summary.status === "loading") {
    return (
      <div className="mt-3 flex flex-col gap-1.5" data-testid="candidate-summary" data-state="loading">
        <span className="sr-only">Loading summary</span>
        <span className="h-3 w-full animate-pulse rounded bg-slate-200" />
        <span className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }
  if (summary.status === "error" || !summary.text) {
    return (
      <p className="mt-3 text-xs italic text-text-muted" data-testid="candidate-summary" data-state="unavailable">
        Summary unavailable for this candidate.
      </p>
    );
  }
  return (
    <p className="mt-3 text-sm leading-6 text-text-primary" data-testid="candidate-summary" data-state="done">
      {summary.text}
    </p>
  );
}

// One AI Search result. The whole card opens the profile; the name is the
// keyboard-accessible button.
export function AiResultCard({ result, summary, onSelect, index = 0 }: AiResultCardProps) {
  const matched = new Set(result.matchedSkills.map((s) => s.toLowerCase()));
  const skills = [...result.skills].sort((a, b) => Number(matched.has(b.toLowerCase())) - Number(matched.has(a.toLowerCase())));
  const shownSkills = skills.slice(0, MAX_SKILLS);
  const subtitle = [result.role, result.company].filter(Boolean).join(" · ");
  const open = () => onSelect(result.candidateId);

  return (
    <m.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={open}
      className="cursor-pointer rounded-xl border border-line bg-bg-base p-4 transition-shadow hover:border-slate-300 hover:shadow-lg"
      data-testid="result-card"
    >
      <div className="flex items-start gap-3">
        <RankBadge rank={result.rank} />
        <div className="min-w-0 flex-1">
          {/* The score sits beside the name, or below it on narrow screens. */}
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="min-w-0 text-base font-semibold text-text-primary">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                className="max-w-full rounded text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="block break-words" data-testid="candidate-name">
                  {result.name}
                </span>
                <span className="sr-only">, view profile</span>
              </button>
            </h3>
            <Score result={result} />
          </div>
          {subtitle && <p className="mt-0.5 break-words text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-muted">
        {result.sources.includes("bm25") && (
          <span className="inline-flex items-center gap-1 rounded-full bg-score-bm25/10 px-2 py-0.5 text-score-bm25-ink">
            <KeyRound className="h-3 w-3" aria-hidden /> Keyword match
          </span>
        )}
        {result.sources.includes("vector") && (
          <span className="inline-flex items-center gap-1 rounded-full bg-score-vector/10 px-2 py-0.5 text-score-vector-ink">
            <Sparkles className="h-3 w-3" aria-hidden /> Semantic match
          </span>
        )}
        {result.experienceYears !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-text-primary">
            <Briefcase className="h-3 w-3" aria-hidden /> {formatYears(result.experienceYears)}
          </span>
        )}
        {result.email && (
          <span className="inline-flex min-w-0 items-center gap-1 break-all">
            <Mail className="h-3 w-3 shrink-0" aria-hidden /> {result.email}
          </span>
        )}
        {result.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" aria-hidden /> {result.phone}
          </span>
        )}
      </div>

      {result.reason && (
        <p className="mt-3 flex gap-2 rounded-lg bg-score-ai/5 px-3 py-2 text-sm text-text-primary" data-testid="match-reason">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-score-ai" aria-hidden />
          <span>
            <span className="font-medium text-score-ai-ink">Why this match: </span>
            {result.reason}
          </span>
        </p>
      )}

      <Summary summary={summary} />

      {shownSkills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Skills" data-testid="skills">
          {shownSkills.map((skill) => {
            const isMatch = matched.has(skill.toLowerCase());
            return (
              <li
                key={skill}
                className={cn(
                  "rounded px-2 py-0.5 text-xs",
                  isMatch ? "bg-success/15 font-medium text-score-hybrid-ink" : "bg-slate-100 text-text-muted",
                )}
              >
                {skill}
                {isMatch && <span className="sr-only"> (matches your query)</span>}
              </li>
            );
          })}
          {skills.length > MAX_SKILLS && <li className="px-1 py-0.5 text-xs text-text-muted">+{skills.length - MAX_SKILLS} more</li>}
        </ul>
      )}

      {result.duplicates.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted" data-testid="duplicate-note">
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-medium text-text-primary">
            <Copy className="h-3 w-3" aria-hidden />+{result.duplicates.length} more {result.duplicates.length === 1 ? "resume" : "resumes"}
          </span>
          <span className="min-w-0 break-all">Also on file: {result.duplicates.map((d) => d.fileName ?? d.resumeId).join(", ")}</span>
        </p>
      )}
    </m.article>
  );
}
