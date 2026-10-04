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
          aria-label={`${s.label}: search for ${s.query}`}
          className="rounded-full border border-line bg-bg-card px-3 py-1.5 text-xs text-text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-40"
        >
          <span aria-hidden>{s.emoji}</span> {s.label}
        </button>
      ))}
    </div>
  );
}
