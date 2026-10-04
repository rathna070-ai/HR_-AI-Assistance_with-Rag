import type { Education } from "@/types/candidate.types";
import { Section } from "./Section";

export function EducationSection({ education }: { education?: Education[] }) {
  if (!education?.length) return null;
  return (
    <Section label="Education" testId="education-section">
      <ul className="flex flex-col gap-2">
        {education.map((e, i) => (
          <li key={`${e.degree}-${i}`}>
            <p className="text-sm font-medium text-text-primary">{e.degree}</p>
            {(e.institution || e.year) && <p className="text-xs text-text-muted">{[e.institution, e.year].filter(Boolean).join(" · ")}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}
