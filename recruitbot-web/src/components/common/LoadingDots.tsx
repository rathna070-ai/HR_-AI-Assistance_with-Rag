// Three-dot typing indicator.
export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" role="status" aria-label="Searching">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="h-2 w-2 rounded-full bg-text-muted animate-dot-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}
