import { Check } from "lucide-react";
import { MODE_ICONS, SEARCH_MODES } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";
import type { SearchMode } from "@/types/search.types";

interface SearchModeNavProps {
  activeMode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

export function SearchModeNav({ activeMode, onChange }: SearchModeNavProps) {
  return (
    <nav className="flex flex-col gap-2" aria-label="Search mode">
      {(Object.keys(SEARCH_MODES) as SearchMode[]).map((mode) => {
        const Icon = MODE_ICONS[mode];
        const active = mode === activeMode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            aria-label={`${SEARCH_MODES[mode].label} mode`}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
              active ? "border-primary/30 bg-primary/10" : "border-transparent hover:bg-slate-100",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-score-vector" : "text-text-muted")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text-primary">{SEARCH_MODES[mode].label}</span>
              <span className="block text-xs text-text-muted">{SEARCH_MODES[mode].description}</span>
            </span>
            {active && <Check className="h-4 w-4 text-score-vector" aria-hidden />}
          </button>
        );
      })}
    </nav>
  );
}
