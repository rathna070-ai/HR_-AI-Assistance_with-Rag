import { AppShell } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";

// Phase 10 skeleton: sidebar + main column. The chat is added in Phase 12.
export function ChatPage() {
  return (
    <AppShell>
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col" data-testid="chat-main" />
    </AppShell>
  );
}
