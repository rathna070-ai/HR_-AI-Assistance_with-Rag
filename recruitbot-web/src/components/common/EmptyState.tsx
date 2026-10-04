import { SearchX } from "lucide-react";

export function EmptyState({ title = "No candidates found", text = "Try different keywords or another search mode." }: { title?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center" data-testid="empty-state">
      <SearchX className="h-8 w-8 text-text-muted" aria-hidden />
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-muted">{text}</p>
    </div>
  );
}
