import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiStore } from "@/lib/stores/ui.store";
import { SidebarContent } from "./Sidebar";

// Slide-out sidebar for small screens.
export function MobileDrawer() {
  const { isMobileSidebarOpen: open, setMobileSidebarOpen } = useUiStore();
  const isMobile = useIsMobile();
  const close = () => setMobileSidebarOpen(false);

  useEffect(() => {
    if (!isMobile && open) setMobileSidebarOpen(false);
  }, [isMobile, open, setMobileSidebarOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileSidebarOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setMobileSidebarOpen]);

  return (
    <AnimatePresence>
      {open && isMobile && (
        <>
          <m.div
            className="fixed inset-0 z-30 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <m.aside
            className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col gap-4 overflow-y-auto border-r border-white/[0.07] bg-bg-surface p-5"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "tween", duration: 0.2 }}
            aria-label="Sidebar"
            data-testid="mobile-drawer"
          >
            <button
              type="button"
              onClick={close}
              className="self-end rounded-md p-1 text-text-muted hover:bg-white/[0.06]"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <SidebarContent />
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
