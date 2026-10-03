import { CASE_SENSITIVE_SKILLS, SKILL_ALIASES, SKILLS } from "../config/skills";
import { escapeRegex } from "./regex";

interface SkillPattern {
  skill: string;
  regex: RegExp;
}

// Word boundaries are letter-based so "Java" does not match "JavaScript" and
// "SQL" does not match "MySQL", while "C++" and ".NET" still match.
const buildPattern = (term: string): RegExp => {
  const body = term.split(/\s+/).map(escapeRegex).join(String.raw`[\s-]*`);
  return new RegExp(String.raw`(?<!\p{L})${body}(?!\p{L})`, CASE_SENSITIVE_SKILLS.has(term) ? "u" : "iu");
};

const SKILL_PATTERNS: SkillPattern[] = SKILLS.flatMap((skill) =>
  [skill, ...(SKILL_ALIASES[skill] ?? [])].map((term) => ({ skill, regex: buildPattern(term) })),
);

// Returns canonical skill names in the order they first appear in the text.
export const detectSkills = (text: string): string[] => {
  const firstIndex = new Map<string, number>();

  for (const { skill, regex } of SKILL_PATTERNS) {
    const index = text.search(regex);
    if (index !== -1 && index < (firstIndex.get(skill) ?? Infinity)) {
      firstIndex.set(skill, index);
    }
  }

  return [...firstIndex.entries()].sort((a, b) => a[1] - b[1]).map(([skill]) => skill);
};
