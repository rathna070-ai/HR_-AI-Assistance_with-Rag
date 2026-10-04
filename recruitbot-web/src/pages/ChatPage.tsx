import { ChatMain } from "@/components/features/chat/ChatMain";
import { AppShell } from "@/components/layout/AppShell";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { useChatStore } from "@/lib/stores/chat.store";

// Phase 12: the chat interface. The search API is connected in Phase 13;
// until then a query only shows that search is not connected yet.
export function ChatPage() {
  const { addUserMessage, addBotMessage } = useChatStore();

  const submitQuery = (query: string) => {
    addUserMessage(query);
    addBotMessage(<p className="text-text-muted">Search is connected in Phase 13.</p>);
  };

  return (
    <AppShell>
      <Sidebar />
      <MobileDrawer />
      <ChatMain onSubmit={submitQuery} />
    </AppShell>
  );
}
