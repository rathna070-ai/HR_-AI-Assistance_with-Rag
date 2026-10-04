import { AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandAvatar } from "@/components/common/BrandAvatar";
import { SectionLabel } from "@/components/common/SectionLabel";
import { ClearChatButton } from "@/components/features/sidebar/ClearChatButton";
import { HybridWeightPanel } from "@/components/features/sidebar/HybridWeightPanel";
import { ResultsLimitSelect } from "@/components/features/sidebar/ResultsLimitSelect";
import { SearchModeNav } from "@/components/features/sidebar/SearchModeNav";
import { useSearchStore } from "@/lib/stores/search.store";

// The sidebar's controls. Rendered as a fixed column on desktop (Sidebar) and
// inside MobileDrawer on small screens.
export function SidebarContent() {
  const { searchType, setSearchType } = useSearchStore();

  return (
    <>
      <BrandAvatar />
      <SectionLabel>Search Mode</SectionLabel>
      <SearchModeNav activeMode={searchType} onChange={setSearchType} />
      <AnimatePresence>{searchType === "hybrid" && <HybridWeightPanel />}</AnimatePresence>
      <SectionLabel className="mt-auto">Results limit</SectionLabel>
      <ResultsLimitSelect />
      <ClearChatButton />
      {/* Keeps the ingestion feature reachable from the search UI. */}
      <Link
        to="/ingestion"
        className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-text-primary transition-colors hover:bg-white/[0.06]"
      >
        <Upload className="h-4 w-4" aria-hidden />
        Upload resumes
      </Link>
      <footer className="pt-2 text-xs text-text-muted">RecruitBot v2.0</footer>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/[0.07] bg-bg-surface p-5 md:flex">
      <SidebarContent />
    </aside>
  );
}
