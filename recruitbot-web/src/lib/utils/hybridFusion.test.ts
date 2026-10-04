import { describe, expect, it } from "vitest";
import { fuseHybrid } from "./hybridFusion";

const bm25 = [
  { id: "A", name: "A", score: 9 },
  { id: "B", name: "B", score: 5 },
  { id: "C", name: "C", score: 1 },
];
const vector = [
  { id: "C", name: "C", score: 0.9 },
  { id: "D", name: "D", score: 0.85 },
  { id: "A", name: "A", score: 0.8 },
];

describe("fuseHybrid", () => {
  it("lets BM25 win when its weight is high", () => {
    expect(fuseHybrid(bm25, vector, 100, 0, 5)[0].id).toBe("A");
  });

  it("lets vector win when its weight is high", () => {
    expect(fuseHybrid(bm25, vector, 0, 100, 5)[0].id).toBe("C");
  });

  it("deduplicates, scores 0-1 and respects topK", () => {
    const fused = fuseHybrid(bm25, vector, 50, 50, 3);
    expect(fused).toHaveLength(3);
    expect(new Set(fused.map((r) => r.id)).size).toBe(3);
    fused.forEach((r) => expect(r.score).toBeGreaterThanOrEqual(0));
    fused.forEach((r) => expect(r.score).toBeLessThanOrEqual(1));
  });

  it("changes the ranking when the weights change", () => {
    const a = fuseHybrid(bm25, vector, 70, 30, 4).map((r) => r.id);
    const b = fuseHybrid(bm25, vector, 30, 70, 4).map((r) => r.id);
    expect(a).not.toEqual(b);
  });

  it("handles one empty list", () => {
    expect(fuseHybrid([], vector, 50, 50, 2).map((r) => r.id)).toEqual(["C", "D"]);
  });
});
