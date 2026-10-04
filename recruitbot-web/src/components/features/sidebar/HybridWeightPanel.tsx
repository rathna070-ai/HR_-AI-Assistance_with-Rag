import { m } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { useHybridWeights } from "@/hooks/use-hybrid-weights";
import { WEIGHT_PRESETS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

export function HybridWeightPanel() {
  const { bm25Weight, vectorWeight, handleBm25Change, handleVectorChange, applyPreset } = useHybridWeights();

  return (
    <m.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
      data-testid="hybrid-weight-panel"
    >
      <div className="flex flex-col gap-3 rounded-lg border border-white/[0.07] bg-bg-card p-3">
        <p className="text-xs font-medium text-text-primary">Search Weights</p>
        <WeightRow label="BM25" value={bm25Weight} onChange={handleBm25Change} />
        <WeightRow label="Vector" value={vectorWeight} onChange={handleVectorChange} />
        <div className="flex gap-1.5">
          {WEIGHT_PRESETS.map(({ bm25, vector }) => {
            const active = bm25 === bm25Weight && vector === vectorWeight;
            return (
              <button
                key={`${bm25}-${vector}`}
                type="button"
                onClick={() => applyPreset(bm25, vector)}
                aria-label={`Preset BM25 ${bm25}% / Vector ${vector}%`}
                className={cn(
                  "flex-1 rounded-full border px-2 py-1 text-xs transition-colors",
                  active
                    ? "border-indigo-400/40 bg-indigo-500/20 text-text-primary"
                    : "border-white/[0.1] text-text-muted hover:text-text-primary",
                )}
              >
                {bm25}/{vector}
              </button>
            );
          })}
        </div>
      </div>
    </m.div>
  );
}

function WeightRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="font-medium text-text-primary" data-testid={`weight-${label.toLowerCase()}`}>
          {value}%
        </span>
      </div>
      <Slider value={[value]} min={0} max={100} step={5} onValueChange={([v]) => onChange(v)} aria-label={`${label} weight`} />
    </div>
  );
}
