import englishWords from "an-array-of-english-words";

// Some PDFs draw letter pairs such as "ti" or "fi" as one ligature glyph with no
// Unicode mapping, so pdf-parse emits "\u0000" in their place ("tes\u0000ng").
const LIGATURE_PLACEHOLDER = "\u0000";
const LIGATURE_CANDIDATES = ["ti", "fi", "ft", "ff", "ffi", "fl", "tt", "tf", "ffl"];
const MAX_PLACEHOLDERS_PER_WORD = 4;

let dictionary: Set<string> | undefined;
const getDictionary = () => (dictionary ??= new Set(englishWords));

const expandPlaceholders = (word: string): string[] => {
  const [head, ...rest] = word.split(LIGATURE_PLACEHOLDER);
  return rest.reduce(
    (variants, part) =>
      variants.flatMap((prefix) => LIGATURE_CANDIDATES.map((lig) => prefix + lig + part)),
    [head],
  );
};

const restoreWord = (word: string): string => {
  const placeholderCount = word.split(LIGATURE_PLACEHOLDER).length - 1;

  if (placeholderCount <= MAX_PLACEHOLDERS_PER_WORD) {
    const words = getDictionary();
    const match = expandPlaceholders(word).find((variant) => words.has(variant.toLowerCase()));
    if (match) return match;
  }

  // Not a dictionary word (e.g. "fintech"): "fi" is the usual ligature at the
  // start of a word, "ti" everywhere else.
  return word.replace(/\u0000/g, (_ph, offset: number) => (offset === 0 ? "fi" : "ti"));
};

export const restoreLigatures = (text: string): string =>
  text.replace(/[\p{L}\u0000]*\u0000[\p{L}\u0000]*/gu, (word) =>
    /\p{L}/u.test(word) ? restoreWord(word) : "",
  );

export const normalizeLineBreaks = (text: string): string => text.replace(/\r\n?/g, "\n");

export const removeSpecialSymbols = (text: string): string =>
  text
    // Fold compatibility characters, e.g. the real "ﬁ" ligature becomes "fi".
    .normalize("NFKC")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\t/g, " ")
    // Keep letters, digits, whitespace and punctuation used in emails, phones,
    // URLs and skill names (C#, C++, Node.js); drop bullets, icons, emoji, etc.
    .replace(/[^\p{L}\p{N}\s.,:;@+\-/()&#%'"|_?=!*\[\]$]/gu, " ");

export const removeExtraSpaces = (text: string): string =>
  text
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n");

// Drops blank lines and a line that repeats the line directly above it.
// Non-adjacent repeats are kept, e.g. a job title that is also the headline.
export const removeDuplicateLines = (text: string): string =>
  text
    .split("\n")
    .filter((line) => line !== "")
    .filter((line, i, lines) => line.toLowerCase() !== lines[i - 1]?.toLowerCase())
    .join("\n");

export const cleanText = (rawText: string): string => {
  let text = normalizeLineBreaks(rawText);
  text = restoreLigatures(text);
  text = removeSpecialSymbols(text);
  text = removeExtraSpaces(text);
  text = removeDuplicateLines(text);
  return text.trim();
};
