import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandAvatar";
import { useSearchStore } from "@/lib/stores/search.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { MODE_ICONS, SEARCH_MODES } from "@/lib/utils/constants";

export function ChatTopbar() {
  const searchType = useSearchStore((s) => s.searchType);
  const openDrawer = useUiStore((s) => s.setMobileSidebarOpen);
  const mode = SEARCH_MODES[searchType];
  const ModeIcon = MODE_ICONS[searchType];

  return (
    <header className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-8">
      <button
        type="button"
        onClick={() => openDrawer(true)}
        className="rounded-md p-1.5 text-text-muted hover:bg-slate-100 md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      <BrandLogo size={30} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy">TalentLens AI</p>
        <p className="truncate text-xs text-text-muted" data-testid="mode-sublabel">
          {mode.label} · {mode.description}
        </p>
      </div>
      {/* The active search mode, highlighted so it is clear what the next search uses. */}
      <span
        className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm ring-4 ring-primary/15"
        data-testid="mode-badge"
        data-mode={searchType}
      >
        <ModeIcon className="h-4 w-4" aria-hidden />
        {mode.badge}
      </span>
    </header>
  );
}
