import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-medium uppercase tracking-widest text-text-muted", className)}>{children}</p>;
}
