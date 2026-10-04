import { create } from "zustand";
import type { CandidateProfile } from "@/types/candidate.types";

// Shared UI state: the candidate modal (one instance, opened from any result
// card) and the mobile sidebar drawer.
interface UiState {
  isModalOpen: boolean;
  candidateId: string | null;
  candidate: CandidateProfile | null;
  isCandidateLoading: boolean;
  isMobileSidebarOpen: boolean;
  openModal: (candidateId: string) => void;
  setCandidate: (candidate: CandidateProfile | null) => void;
  setCandidateLoading: (loading: boolean) => void;
  closeModal: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isModalOpen: false,
  candidateId: null,
  candidate: null,
  isCandidateLoading: false,
  isMobileSidebarOpen: false,
  openModal: (candidateId) => set({ isModalOpen: true, candidateId, candidate: null }),
  setCandidate: (candidate) => set({ candidate }),
  setCandidateLoading: (loading) => set({ isCandidateLoading: loading }),
  closeModal: () => set({ isModalOpen: false, candidateId: null, candidate: null, isCandidateLoading: false }),
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
}));
