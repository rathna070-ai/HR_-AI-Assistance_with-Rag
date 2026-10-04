import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchStore } from "@/lib/stores/search.store";
import { TOP_K_OPTIONS } from "@/lib/utils/constants";

export function ResultsLimitSelect() {
  const { topK, setTopK } = useSearchStore();
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <span>Show top</span>
      <Select value={String(topK)} onValueChange={(v) => setTopK(Number(v))}>
        <SelectTrigger className="w-16" aria-label="Number of results">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TOP_K_OPTIONS.map((k) => (
            <SelectItem key={k} value={String(k)}>
              {k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>results</span>
    </div>
  );
}
