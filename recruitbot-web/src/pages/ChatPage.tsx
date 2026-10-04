import { CandidateModal } from "@/components/features/candidate/CandidateModal";
import { ChatMain } from "@/components/features/chat/ChatMain";
import { AppShell } from "@/components/layout/AppShell";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSearch } from "@/hooks/use-search";

export function ChatPage() {
  const { submitQuery } = useSearch();

  return (
    <AppShell>
      <Sidebar />
      <MobileDrawer />
      <ChatMain onSubmit={submitQuery} />
      <CandidateModal />
    </AppShell>
  );
}
