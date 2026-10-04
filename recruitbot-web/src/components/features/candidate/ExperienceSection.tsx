import { formatYears } from "@/lib/utils/formatters";
import type { Experience } from "@/types/candidate.types";
import { Section } from "./Section";

interface ExperienceSectionProps {
  experience?: Experience[];
  totalExperience?: number;
  summary?: string;
}

export function ExperienceSection({ experience = [], totalExperience, summary }: ExperienceSectionProps) {
  if (!experience.length && totalExperience === undefined && !summary) return null;
  return (
    <Section label="Experience" testId="experience-section">
      {totalExperience !== undefined && <p className="text-sm text-text-primary">{formatYears(totalExperience)} total</p>}
      {summary && <p className="text-sm leading-relaxed text-text-muted">{summary}</p>}
      {experience.length > 0 && (
        <ol className="flex flex-col gap-3 border-l border-white/[0.1] pl-4">
          {experience.map((job, i) => (
            <li key={`${job.title}-${i}`} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
              <p className="text-sm font-medium text-text-primary">{job.title}</p>
              {(job.company || job.duration) && (
                <p className="text-xs text-text-muted">{[job.company, job.duration].filter(Boolean).join(" · ")}</p>
              )}
              {job.description && <p className="mt-1 text-xs text-text-muted">{job.description}</p>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
