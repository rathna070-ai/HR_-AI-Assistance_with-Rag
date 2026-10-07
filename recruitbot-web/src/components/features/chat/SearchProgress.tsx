import { useEffect, useState } from "react";
import { LoadingDots } from "@/components/common/LoadingDots";
import type { SearchMode } from "@/types/search.types";

// Loading message while a search runs. AI Search is one request, so this
// describes the whole pipeline instead of pretending to track each step.
export function SearchProgress({ mode }: { mode: SearchMode | null }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const text = mode === "ai" ? "Searching resumes, removing duplicates and re-ranking with AI…" : "Searching resumes…";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="search-progress">
      <LoadingDots />
      <span className="text-sm text-text-muted">
        {text}
        {seconds >= 2 && <span className="tabular-nums"> {seconds} s</span>}
      </span>
    </div>
  );
}
