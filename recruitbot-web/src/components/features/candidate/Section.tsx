import type { ReactNode } from "react";
import { SectionLabel } from "@/components/common/SectionLabel";

export function Section({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-2" data-testid={testId}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  );
}
