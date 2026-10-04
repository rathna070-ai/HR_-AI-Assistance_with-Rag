import { useSearchStore } from "@/lib/stores/search.store";

// The two weights are complementary: they always sum to 100.
export function useHybridWeights() {
  const { bm25Weight, vectorWeight, setWeights } = useSearchStore();

  function handleBm25Change(value: number) {
    setWeights(value, 100 - value);
  }

  function handleVectorChange(value: number) {
    setWeights(100 - value, value);
  }

  function applyPreset(bm25: number, vector: number) {
    setWeights(bm25, vector);
  }

  return { bm25Weight, vectorWeight, handleBm25Change, handleVectorChange, applyPreset };
}
