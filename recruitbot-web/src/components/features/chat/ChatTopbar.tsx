import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandAvatar";
import { useSearchStore } from "@/lib/stores/search.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { MODE_COLOURS, SEARCH_MODES } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

export function ChatTopbar() {
  const searchType = useSearchStore((s) => s.searchType);
  const openDrawer = useUiStore((s) => s.setMobileSidebarOpen);
  const mode = SEARCH_MODES[searchType];

  return (
    <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3 md:px-8">
      <button
        type="button"
        onClick={() => openDrawer(true)}
        className="rounded-md p-1.5 text-text-muted hover:bg-white/[0.06] md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      <BrandLogo size={30} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">RecruitBot</p>
        <p className="truncate text-xs text-text-muted" data-testid="mode-sublabel">
          {mode.label} · {mode.description}
        </p>
      </div>
      <span
        className={cn("rounded-full px-3 py-1 text-xs font-medium", MODE_COLOURS[searchType].badge)}
        data-testid="mode-badge"
        data-mode={searchType}
      >
        {mode.badge}
      </span>
    </header>
  );
}
