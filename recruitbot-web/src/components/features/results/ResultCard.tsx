import { m } from "framer-motion";
import { Briefcase, Mail, Phone } from "lucide-react";
import { SNIPPET_LENGTH } from "@/lib/utils/constants";
import { formatYears } from "@/lib/utils/formatters";
import { truncate } from "@/lib/utils/sanitize";
import type { SearchMode, SearchResult } from "@/types/search.types";
import { RankBadge } from "./RankBadge";
import { ScorePill } from "./ScorePill";

interface ResultCardProps {
  result: SearchResult;
  rank: number;
  searchType: SearchMode;
  onSelect: (candidateId: string) => void;
  index?: number;
}

// One clickable card. Text from the API is rendered as text (React escapes it).
export function ResultCard({ result, rank, searchType, onSelect, index = 0 }: ResultCardProps) {
  return (
    <m.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => onSelect(result.candidateId)}
      aria-label={`View profile of ${result.name}`}
      className="w-full rounded-xl border border-white/[0.07] bg-bg-base/60 p-4 text-left transition-shadow hover:border-white/[0.12] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      data-testid="result-card"
    >
      <div className="flex items-center gap-3">
        <RankBadge rank={rank} />
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">{result.name}</span>
        <ScorePill score={result.score} searchType={searchType} />
      </div>
      {(result.experienceYears !== undefined || result.email || result.phoneNumber) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          {result.experienceYears !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-text-primary">
              <Briefcase className="h-3 w-3" aria-hidden /> {formatYears(result.experienceYears)}
            </span>
          )}
          {result.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" aria-hidden /> {result.email}
            </span>
          )}
          {result.phoneNumber && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" aria-hidden /> {result.phoneNumber}
            </span>
          )}
        </div>
      )}
      {result.content && <p className="mt-2 text-xs leading-relaxed text-text-muted">{truncate(result.content, SNIPPET_LENGTH)}</p>}
    </m.button>
  );
}
