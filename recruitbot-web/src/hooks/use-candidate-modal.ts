import toast from "react-hot-toast";
import { candidateApi } from "@/lib/api/candidate.api";
import { useUiStore } from "@/lib/stores/ui.store";

// Modal state lives in the UI store so any result card can open the single
// modal rendered by ChatPage.
export function useCandidateModal() {
  const {
    isModalOpen: isOpen,
    candidate,
    isCandidateLoading: loading,
    openModal,
    setCandidate,
    setCandidateLoading,
    closeModal,
  } = useUiStore();

  async function openCandidateModal(id: string) {
    openModal(id);
    setCandidateLoading(true);
    try {
      const data = await candidateApi.getCandidate(id);
      // Ignore a late response if the user already opened another candidate.
      if (useUiStore.getState().candidateId === id) setCandidate(data);
    } catch {
      toast.error("Failed to load candidate profile.");
      closeModal();
    } finally {
      if (useUiStore.getState().candidateId === id) setCandidateLoading(false);
    }
  }

  return { isOpen, candidate, loading, openCandidateModal, closeModal };
}
