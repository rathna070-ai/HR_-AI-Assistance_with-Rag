// Blends the two lists returned by POST /v1/search/hybrid using the sidebar
// weights. The backend returns BM25 and vector results separately (it does
// not merge their scores), and the two scales differ (BM25 is unbounded,
// vector is 0-1), so each list is min-max scaled to 0-1 first.
export interface RankedHit {
  id: string;
  name: string | null;
  score: number;
}

const normalize = (hits: RankedHit[]): Map<string, number> => {
  const scores = hits.map((h) => h.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  // One hit, or all equal: each is the best match of its list.
  return new Map(hits.map((h) => [h.id, max === min ? 1 : (h.score - min) / (max - min)]));
};

// weights are percentages (e.g. 70 / 30); a resume missing from one list
// scores 0 for that list.
export function fuseHybrid(bm25: RankedHit[], vector: RankedHit[], bm25Weight: number, vectorWeight: number, topK: number): RankedHit[] {
  const total = bm25Weight + vectorWeight || 1;
  const wb = bm25Weight / total;
  const wv = vectorWeight / total;
  const nb = normalize(bm25);
  const nv = normalize(vector);
  const names = new Map([...vector, ...bm25].map((h) => [h.id, h.name]));

  return [...names.keys()]
    .map((id) => ({ id, name: names.get(id) ?? null, score: wb * (nb.get(id) ?? 0) + wv * (nv.get(id) ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
