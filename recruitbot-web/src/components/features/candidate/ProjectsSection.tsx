import { Section } from "./Section";

export function ProjectsSection({ projects }: { projects?: { title: string; description: string }[] }) {
  if (!projects?.length) return null;
  return (
    <Section label="Projects" testId="projects-section">
      <ul className="flex flex-col gap-2">
        {projects.map((p) => (
          <li key={p.title}>
            <p className="text-sm font-semibold text-text-primary">{p.title}</p>
            <p className="text-xs text-text-muted">{p.description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
