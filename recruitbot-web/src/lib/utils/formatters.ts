export const formatScore = (score: number): string => score.toFixed(2);

export const formatDuration = (ms: number): string => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

export const formatTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const formatYears = (years: number): string => `${Number.isInteger(years) ? years : years.toFixed(1)} yrs`;
