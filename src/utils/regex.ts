export const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export const PHONE_REGEX = /(\+91[\-\s]?)?[0]?(91)?[789]\d{9}/;

export const EXPERIENCE_REGEX = /(\d+(\.\d+)?)\s*(years|yrs)/i;

// Resumes also write "7+ years", "4years", "3 Years 4 Months" and
// "+91 87600 28904", which the spec regexes above do not cover.
export const EXPERIENCE_DETAIL_REGEX =
  /(\d{1,2}(?:\.\d{1,2})?)\s*\+?\s*(?:years?|yrs?)\.?(?:\s*(?:and\s+)?(\d{1,2})\s*(?:months?|mos?)\b)?/gi;

// A run of digits with the separators people put inside phone numbers.
export const PHONE_CANDIDATE_REGEX = /[+(]*\d[\d \t().+-]{8,16}\d/g;

export const URL_REGEX = /\b(?:https?:\/\/|www\.)\S+|\b\S+\.(?:com|in|io|me)\/\S*/gi;

const MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE = String.raw`(?:(?:${MONTH})[\s.,'-]*\d{4}|\d{1,2}[/.-]\d{4}|\d{4})`;
const RANGE_SEPARATOR = String.raw`\s*(?:-|to|till|until)\s*`;

// "Apr 2025 - Present", "07/2023 - 08/2024", "2023 - 2024", "Sep 2019 to July 2022".
export const DATE_RANGE_REGEX = new RegExp(
  String.raw`(${DATE})${RANGE_SEPARATOR}(${DATE}|present|current|now|till\s+date)`,
  "gi",
);

export const PRESENT_DATE_RANGE_REGEX = new RegExp(
  String.raw`${DATE}${RANGE_SEPARATOR}(?:present|current|now|till\s+date)`,
  "i",
);

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
