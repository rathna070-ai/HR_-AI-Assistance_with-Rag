import { Section } from "./Section";

export function SkillsSection({ skills }: { skills?: string[] }) {
  if (!skills?.length) return null;
  return (
    <Section label="Skills" testId="skills-section">
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span key={skill} className="rounded bg-accent/10 px-2 py-1 text-xs text-indigo-700">
            {skill}
          </span>
        ))}
      </div>
    </Section>
  );
}
