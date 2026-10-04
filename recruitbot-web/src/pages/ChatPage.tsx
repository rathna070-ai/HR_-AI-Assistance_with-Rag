import { lazy, Suspense, useState } from "react";
import { ChatMain } from "@/components/features/chat/ChatMain";
import { AppShell } from "@/components/layout/AppShell";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSearch } from "@/hooks/use-search";
import { useUiStore } from "@/lib/stores/ui.store";

// The modal's code is downloaded the first time a profile is opened, then
// stays mounted so its close animation can play.
const CandidateModal = lazy(() => import("@/components/features/candidate/CandidateModal").then((m) => ({ default: m.CandidateModal })));

export function ChatPage() {
  const { submitQuery } = useSearch();
  const isModalOpen = useUiStore((s) => s.isModalOpen);
  const [modalRequested, setModalRequested] = useState(false);

  // Set during render (not in an effect) the first time a profile opens.
  if (isModalOpen && !modalRequested) setModalRequested(true);

  return (
    <AppShell>
      <Sidebar />
      <MobileDrawer />
      <ChatMain onSubmit={submitQuery} />
      {modalRequested && (
        <Suspense fallback={null}>
          <CandidateModal />
        </Suspense>
      )}
    </AppShell>
  );
}
