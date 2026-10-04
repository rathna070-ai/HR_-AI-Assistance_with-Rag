import { SUGGESTIONS } from "@/lib/utils/constants";

export function SuggestionChips({ onPick, disabled }: { onPick: (query: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="suggestion-chips">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s.query)}
          aria-label={`Search: ${s.query}`}
          className="rounded-full border border-white/[0.1] bg-bg-card px-3 py-1.5 text-xs text-text-primary transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 disabled:opacity-40"
        >
          <span aria-hidden>{s.emoji}</span> {s.label}
        </button>
      ))}
    </div>
  );
}
