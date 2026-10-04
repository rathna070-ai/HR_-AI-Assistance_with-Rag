import { Section } from "./Section";

export function CertificationsSection({ certifications }: { certifications?: string[] }) {
  if (!certifications?.length) return null;
  return (
    <Section label="Certifications" testId="certifications-section">
      <div className="flex flex-wrap gap-1.5">
        {certifications.map((c) => (
          <span key={c} className="rounded-full border border-line px-2.5 py-1 text-xs text-text-primary">
            {c}
          </span>
        ))}
      </div>
    </Section>
  );
}
