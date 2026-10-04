import type { ReactNode } from "react";

// Outer flex container: sidebar column + full-height main column.
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="flex h-full w-full overflow-hidden bg-bg-base text-text-primary">{children}</div>;
}
