import {
  ACRONYMS,
  CITIES,
  COMPANY_FALSE_FOLLOWERS,
  COMPANY_SUFFIXES,
  DEGREE_PATTERNS,
  KNOWN_COMPANIES,
  MAX_EXPERIENCE_YEARS,
  NON_NAME_WORDS,
  ROLE_NOUNS,
  ROLE_PREFIX_STOPWORDS,
  STATES,
} from "../config/resumeDictionaries";
import { SKILLS } from "../config/skills";
import { ParsedResume, ResumeParser } from "../types/resume";
import {
  DATE_RANGE_REGEX,
  EMAIL_REGEX,
  EXPERIENCE_DETAIL_REGEX,
  PHONE_CANDIDATE_REGEX,
  PRESENT_DATE_RANGE_REGEX,
  URL_REGEX,
  escapeRegex,
} from "../utils/regex";
import { detectSkills } from "../utils/skillDetector";

// Matches a dictionary word as written or in ALL CAPS ("Chennai" / "CHENNAI").
const dictionaryRegex = (list: string[], flags = "") =>
  new RegExp(
    String.raw`(?<!\p{L})(${list.flatMap((w) => [w, w.toUpperCase()]).map(escapeRegex).join("|")})(?!\p{L})`,
    `u${flags}`,
  );

const CITY_REGEX = dictionaryRegex(CITIES);
const STATE_AFTER_CITY_REGEX = new RegExp(
  String.raw`(\p{Lu}\p{L}+)\s*,\s*(?:${STATES.map(escapeRegex).join("|")})\b`,
  "u",
);
const COMPANY_DICTIONARY_REGEX = dictionaryRegex(KNOWN_COMPANIES, "g");
const COMPANY_SUFFIX_PATTERN = COMPANY_SUFFIXES.flatMap((s) => [s, s.toUpperCase()])
  .map((s) => s.split(" ").map(escapeRegex).join(String.raw`[.\s]*`))
  .join("|");
// One to four capitalised words (or "&") followed by a suffix: "Larsen & Toubro Limited".
const COMPANY_SUFFIX_REGEX = new RegExp(
  String.raw`(?<!\p{L})((?:(?:[A-Z][A-Za-z0-9&'-]*|&)\s+){1,4})(${COMPANY_SUFFIX_PATTERN})\.?(?!\p{L})`,
  "gu",
);
const ONLY_SUFFIX_REGEX = new RegExp(String.raw`^(?:(?:${COMPANY_SUFFIX_PATTERN})[.\s]*)+$`, "i");
const DATE_WORD_REGEX = /^(?:present|current|till|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i;
const COMPANY_CONNECTORS = new Set(["of", "and", "&", "the"]);

const ROLE_NOUN_SET = new Set(ROLE_NOUNS.map((n) => n.toLowerCase()));
const ROLE_PHRASE_REGEX = new RegExp(
  String.raw`((?:[A-Z][A-Za-z/&+.-]*\s+){0,3})(${ROLE_NOUNS.join("|")})(?!\p{L})`,
  "u",
);
const SKILL_NAMES = new Set(SKILLS.map((s) => s.toLowerCase()));
const LOCATION_WORDS = new Set([...CITIES, ...STATES].map((w) => w.toLowerCase()));

const SECTION_WORDS = new Set([
  "summary", "profile", "objective", "skills", "education", "projects", "certifications",
  "achievements", "languages", "hobbies", "personal", "declaration", "tools", "domain",
  "awards", "training", "internships", "strengths", "interests", "references", "contact",
]);
const EXPERIENCE_HEADING_REGEX =
  /^(?:(?:professional|work|employment|career|relevant|industry)\s+)?(?:experience|history)\b/i;
// Date ranges on or next to these lines are study periods, not jobs.
const EDUCATION_LINE_REGEX =
  /universit|college|school|institute|academy|degree|bachelor|master|b\.?\s?tech|b\.e\b|m\.e\b|mba|mca|bca|b\.?com|b\.?sc|hsc|sslc|cgpa|gpa|percentage/i;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const words = (line: string) => line.split(/\s+/).filter(Boolean);

const round1 = (n: number) => Math.round(n * 10) / 10;

const isAllCaps = (s: string) => /\p{Lu}/u.test(s) && !/\p{Ll}/u.test(s);

// "ADMIN EXECUTIVE" -> "Admin Executive", keeping acronyms such as "QA".
const toTitleCase = (s: string) =>
  s.replace(/\p{L}+/gu, (w) => (ACRONYMS.has(w) ? w : w[0] + w.slice(1).toLowerCase()));

const dropTrailingLocation = (list: string[]) =>
  list.filter((w, idx) => !(idx === list.length - 1 && idx > 0 && LOCATION_WORDS.has(w.toLowerCase())));

const isHeading = (line: string) =>
  words(line).length <= 4 &&
  /^[\p{L}&/\s]+$/u.test(line) &&
  words(line).some((w) => SECTION_WORDS.has(w.toLowerCase()));

const isExperienceHeading = (line: string) =>
  words(line).length <= 5 && !/\d/.test(line) && !line.endsWith(".") && EXPERIENCE_HEADING_REGEX.test(line);

const isRoleLine = (line: string) => {
  const w = words(line.replace(/\(.*?\)|\|.*$/g, " "));
  return (
    w.length > 0 &&
    w.length <= 6 &&
    !/[\d@:]/.test(line) &&
    ROLE_NOUN_SET.has(w[w.length - 1].toLowerCase().replace(/[^\p{L}]/gu, ""))
  );
};

// Drops words caught in front of the title that are not part of it:
// "Chennai Customer Support Associate", "SUBASREE BASKARAN HR Executive".
const cleanRole = (role: string, nameTokens: Set<string>): string => {
  const w = words(role.replace(/\(.*?\)|\|.*$/g, " "));
  const isNoise = (t: string) => {
    const lower = t.toLowerCase();
    return (
      ROLE_PREFIX_STOPWORDS.has(lower) ||
      SECTION_WORDS.has(lower) ||
      LOCATION_WORDS.has(lower) ||
      nameTokens.has(lower) ||
      /\d/.test(t) ||
      /^\p{L}\.?$/u.test(t)
    );
  };
  while (w.length > 1 && isNoise(w[0])) w.shift();
  const result = w.join(" ").replace(/[,.;:-]+$/, "");
  return isAllCaps(result) ? toTitleCase(result) : result;
};

interface ResumeContext {
  text: string;
  lines: string[];
  email: string | null;
  contactLineIndexes: number[];
  experienceLines: string[];
  experienceStart: number;
}

export class AlgorithmResumeParser implements ResumeParser {
  async parseResume(rawText: string): Promise<ParsedResume> {
    const text = rawText.replace(/\r\n?/g, "\n");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const email = this.extractEmail(text);
    const phone = this.extractPhone(text);

    const emailLocal = email?.split("@")[0];
    const contactLineIndexes = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => (emailLocal && line.toLowerCase().includes(emailLocal)) || this.extractPhone(line))
      .map(({ i }) => i);

    const { experienceLines, experienceStart } = this.findExperienceSection(lines);
    const ctx: ResumeContext = { text, lines, email, contactLineIndexes, experienceLines, experienceStart };
    const nameIndex = this.findNameIndex(ctx);
    const role = this.extractRole(ctx, nameIndex);

    return {
      name: nameIndex === -1 ? null : words(lines[nameIndex]).join(" "),
      email,
      phone,
      location: this.extractLocation(ctx),
      skills: detectSkills(text),
      company: this.extractCompany(ctx),
      role,
      education: this.extractEducation(text),
      totalExperience: this.extractExperience(ctx),
      jobTitles: role ? [role] : [],
      experienceSummary: null,
      relevantExperience: null,
    };
  }

  extractEmail(text: string): string | null {
    const direct = text.match(EMAIL_REGEX);
    if (direct) return direct[0].toLowerCase();
    // Narrow PDF columns can wrap an email mid-domain: "name@g\nmail.com".
    const joined = text.replace(/(@[\w-]*)\n(?=[\w.-]+\.[a-z]{2,}\b)/gi, "$1");
    return joined.match(EMAIL_REGEX)?.[0].toLowerCase() ?? null;
  }

  // Returns a 10-digit Indian mobile number, dropping +91 / 0 prefixes and separators.
  extractPhone(text: string): string | null {
    for (const [candidate] of text.replace(URL_REGEX, " ").matchAll(PHONE_CANDIDATE_REGEX)) {
      const match = candidate.replace(/\D/g, "").match(/^(?:91|0)?([6-9]\d{9})$/);
      if (match) return match[1];
    }
    return null;
  }

  private findExperienceSection(lines: string[]) {
    const start = lines.findIndex(isExperienceHeading);
    if (start === -1) return { experienceLines: [], experienceStart: -1 };
    const length = lines.slice(start + 1).findIndex(isHeading);
    const end = length === -1 ? lines.length : start + 1 + length;
    return { experienceLines: lines.slice(start + 1, end), experienceStart: start + 1 };
  }

  // Scores short, letters-only lines near the top or near the contact details;
  // a line whose words also appear in the email address wins.
  private findNameIndex({ lines, email, contactLineIndexes }: ResumeContext): number {
    const emailLocal = email?.split("@")[0].replace(/[^a-z]/g, "") ?? "";
    const nearContact = (i: number) => contactLineIndexes.some((c) => Math.abs(c - i) <= 3);

    let best = { index: -1, score: 2 };
    lines.forEach((line, i) => {
      if (i >= 10 && !nearContact(i)) return;
      const tokens = words(line);
      if (
        tokens.length > 5 ||
        line.length > 40 ||
        !/^\p{L}[\p{L}.' -]*$/u.test(line) ||
        SKILL_NAMES.has(line.toLowerCase()) ||
        LOCATION_WORDS.has(line.toLowerCase()) ||
        isRoleLine(line) ||
        tokens.some((t) => NON_NAME_WORDS.has(t.toLowerCase()) || ROLE_NOUN_SET.has(t.toLowerCase()))
      ) {
        return;
      }

      const parts = line.toLowerCase().split(/[\s.]+/).filter((p) => p.length >= 3);
      const matchesEmail = Boolean(emailLocal) && parts.some((p) => emailLocal.includes(p));
      // One-word lines ("SALES", "Resolution") only count when the email confirms them.
      if (tokens.length === 1 && !matchesEmail) return;

      let score = 0;
      if (matchesEmail) score += 4;
      if (nearContact(i)) score += 2;
      if (i < 3) score += 3;
      else if (i < 8) score += 1;
      score += tokens.every((t) => /^\p{Lu}/u.test(t)) ? 1 : -3;

      if (score > best.score) best = { index: i, score };
    });
    return best.index;
  }

  private extractLocation({ text, lines, contactLineIndexes }: ResumeContext): string | null {
    const canonical = (city: string) => CITIES.find((c) => c.toLowerCase() === city.toLowerCase()) ?? city;
    const contactLines = lines.filter(
      (_line, i) => i < 8 || contactLineIndexes.some((c) => Math.abs(c - i) <= 2),
    );
    const labelled = lines.filter((line) => /^(?:city|location|address|current location)\b/i.test(line));

    for (const line of [...contactLines, ...labelled]) {
      const city = line.match(CITY_REGEX)?.[1];
      if (city) return canonical(city);
    }
    for (const line of contactLines) {
      const city = line.match(STATE_AFTER_CITY_REGEX)?.[1];
      if (city && !NON_NAME_WORDS.has(city.toLowerCase())) return city;
    }
    const anywhere = text.match(CITY_REGEX)?.[1];
    return anywhere ? canonical(anywhere) : null;
  }

  private findCompanyCandidates(lines: string[]): { name: string; line: number }[] {
    const candidates: { name: string; line: number; col: number }[] = [];

    lines.forEach((line, i) => {
      for (const m of line.matchAll(COMPANY_DICTIONARY_REGEX)) {
        candidates.push({ name: m[1], line: i, col: m.index });
      }
      for (const m of line.matchAll(COMPANY_SUFFIX_REGEX)) {
        const after = line.slice(m.index + m[0].length);
        if (after.startsWith(":")) continue; // "Operating Systems: Windows" is a skills label
        const nextWord = after.match(/^\s+(\p{L}+)/u)?.[1]?.toLowerCase();
        if (nextWord && (ROLE_NOUN_SET.has(nextWord) || COMPANY_FALSE_FOLLOWERS.has(nextWord))) continue;
        if (words(m[1]).some((w) => ROLE_NOUN_SET.has(w.toLowerCase()))) continue;

        // "Present Varsiddhi Enterprises Pvt. Ltd." / "Aug2025 Besant Technologies"
        const nameWords = words(m[0]);
        while (nameWords.length > 1 && (/\d/.test(nameWords[0]) || DATE_WORD_REGEX.test(nameWords[0]))) {
          nameWords.shift();
        }
        const name = nameWords.join(" ");
        if (!ONLY_SUFFIX_REGEX.test(name)) candidates.push({ name, line: i, col: m.index });
      }
    });

    return candidates.sort((a, b) => a.line - b.line || a.col - b.col);
  }

  // Treats a short line next to a "... - Present" date as the employer name,
  // e.g. "Apr 2025 - Present" followed by "Finfresh Wealth Creations Chennai".
  private companyNextToDate(lines: string[], dateLine: number): string | null {
    for (const i of [dateLine + 1, dateLine + 2, dateLine - 1, dateLine - 2]) {
      const line = lines[i];
      if (
        !line ||
        words(line).length > 6 ||
        /[\d:@]/.test(line) ||
        line.endsWith(".") ||
        !/^\p{Lu}/u.test(line) ||
        isRoleLine(line) ||
        isHeading(line) ||
        isExperienceHeading(line)
      ) {
        continue;
      }

      const lineWords = words(line.split(/[,|]/)[0]);
      const isConnector = (w: string) => COMPANY_CONNECTORS.has(w.toLowerCase());
      if (
        lineWords.every((w) => LOCATION_WORDS.has(w.toLowerCase())) ||
        lineWords.some((w) => NON_NAME_WORDS.has(w.toLowerCase()) && !isConnector(w)) ||
        lineWords.some((w) => /^\p{Ll}/u.test(w) && !isConnector(w)) ||
        /ing$/i.test(lineWords[0]) // "Playing basketball"
      ) {
        continue;
      }

      const name = dropTrailingLocation(lineWords).join(" ");
      if (name && !SKILL_NAMES.has(name.toLowerCase())) return name;
    }
    return null;
  }

  // Prefers the current employer (next to a "- Present" date), then the first
  // employer in the experience section, then the first company anywhere.
  private extractCompany({ lines, experienceStart, experienceLines }: ResumeContext): string | null {
    const candidates = this.findCompanyCandidates(lines);
    const presentLine = lines.findIndex((line) => PRESENT_DATE_RANGE_REGEX.test(line));

    if (presentLine !== -1) {
      const near = candidates
        .filter((c) => Math.abs(c.line - presentLine) <= 2)
        .sort((a, b) => Math.abs(a.line - presentLine) - Math.abs(b.line - presentLine));
      if (near.length) return near[0].name;
      const neighbour = this.companyNextToDate(lines, presentLine);
      if (neighbour) return neighbour;
    }

    if (experienceStart !== -1) {
      const inSection = candidates.find(
        (c) => c.line >= experienceStart && c.line < experienceStart + experienceLines.length,
      );
      if (inSection) return inSection.name;
    }

    return candidates[0]?.name ?? null;
  }

  private extractRole({ text, lines, experienceLines }: ResumeContext, nameIndex: number): string | null {
    const nameTokens = new Set(nameIndex === -1 ? [] : words(lines[nameIndex].toLowerCase()));
    const clean = (role: string) => cleanRole(role, nameTokens);

    // 1. A title line under the name or at the top of the resume.
    const headerIndexes = [
      ...(nameIndex === -1 ? [] : [nameIndex + 1, nameIndex + 2, nameIndex + 3]),
      ...Array.from({ length: 6 }, (_v, i) => i),
    ];
    for (const i of headerIndexes) {
      if (lines[i] && isRoleLine(lines[i])) return clean(lines[i]);
    }

    // 2. The first title in the experience section.
    for (const line of experienceLines) {
      const match = line.match(ROLE_PHRASE_REGEX);
      if (match) return clean(match[0]);
    }

    // 3. A "Role: ..." / "Designation: ..." label.
    for (const line of lines) {
      const label = line.match(/^(?:role|designation|position|title)\s*[:-]\s*([^/|]+)/i)?.[1];
      if (label) return clean(label);
    }

    // 4. The first title anywhere (usually the summary: "Automation Test Engineer with ...").
    const match = text.match(ROLE_PHRASE_REGEX);
    return match ? clean(match[0]) : null;
  }

  // Returns the highest qualification with its specialisation, e.g.
  // "B-tech in Computer Science and Engineering".
  extractEducation(text: string): string | null {
    let best: { index: number; rank: number } | undefined;
    for (const { regex, rank } of DEGREE_PATTERNS) {
      const index = text.search(regex);
      if (index !== -1 && (!best || rank > best.rank || (rank === best.rank && index < best.index))) {
        best = { index, rank };
      }
    }
    if (!best) return null;

    const line = text.slice(best.index).split("\n")[0];
    const degree = line
      // Cut at separators, years, GPA and the like: "Master of Commerce -Anna", "MCA, 2022".
      .replace(
        /\s*(?:[|;,()]|\s[-–]|-\s|-\d|\s(?:from|at|with|GPA|CGPA|graduate|student|candidate|completed)\b|\s\d{4}\b|\s\d{1,2}[/.]\d{4}).*$/i,
        "",
      )
      // "MBA Anna University" -> "MBA"
      .replace(/\s+(?:\S+\s+){0,3}?(?:University|College|Collage|Institute|School|Academy)\b.*$/i, "")
      .replace(/[\s:-]+$/, "");
    return dropTrailingLocation(words(degree)).slice(0, 8).join(" ") || null;
  }

  private extractExperience({ text, lines, experienceLines }: ResumeContext): number | null {
    // Stated total, e.g. "7+ years of experience" or "4 Years 0 Month".
    for (const m of text.matchAll(EXPERIENCE_DETAIL_REGEX)) {
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 50);
      const before = text.slice(Math.max(0, m.index - 30), m.index);
      if (!/exp/i.test(after) && !/experience\s*[:-]?\s*$/i.test(before)) continue;

      const years = Number(m[1]) + (m[2] ? Number(m[2]) / 12 : 0);
      if (years > 0 && years <= MAX_EXPERIENCE_YEARS) return round1(years);
    }

    // Otherwise add up the employment date ranges.
    const months = this.sumDateRanges(experienceLines.length ? experienceLines : lines);
    return months > 0 ? round1(Math.min(months / 12, MAX_EXPERIENCE_YEARS)) : null;
  }

  private toMonthIndex(value: string, isEnd: boolean): number | null {
    const v = value.trim().toLowerCase();
    if (/present|current|now|date/.test(v)) {
      const now = new Date();
      return now.getFullYear() * 12 + now.getMonth();
    }
    const year = Number(v.match(/\d{4}/)?.[0]);
    if (!year || year < 1970) return null;

    const monthName = MONTHS.findIndex((m) => v.startsWith(m));
    const monthNumber = Number(v.match(/^(\d{1,2})[/.-]\d{4}/)?.[1]);
    const month =
      monthName !== -1 ? monthName : monthNumber >= 1 && monthNumber <= 12 ? monthNumber - 1 : isEnd ? 11 : 0;
    return year * 12 + month;
  }

  // Total months covered by job date ranges, counting overlapping jobs once.
  private sumDateRanges(lines: string[]): number {
    const ranges = lines
      .flatMap((line, i) =>
        [lines[i - 1], line, lines[i + 1]].some((l) => l && EDUCATION_LINE_REGEX.test(l))
          ? []
          : [...line.matchAll(DATE_RANGE_REGEX)],
      )
      .map((m) => [this.toMonthIndex(m[1], false), this.toMonthIndex(m[2], true)])
      .filter((r): r is [number, number] => r[0] !== null && r[1] !== null && r[0] <= r[1])
      .sort((a, b) => a[0] - b[0]);

    let total = 0;
    let current: [number, number] | undefined;
    for (const [start, end] of ranges) {
      if (current && start <= current[1]) {
        current[1] = Math.max(current[1], end);
      } else {
        if (current) total += current[1] - current[0] + 1;
        current = [start, end];
      }
    }
    if (current) total += current[1] - current[0] + 1;
    return total;
  }
}

export const algorithmResumeParser = new AlgorithmResumeParser();
