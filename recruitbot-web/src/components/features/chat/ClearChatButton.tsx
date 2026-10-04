import { Eraser } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat.store";
import { useSearchStore } from "@/lib/stores/search.store";

// Shown next to the send button. Clearing the thread brings back the welcome
// message; a search still running is abandoned so the input is usable again.
export function ClearChatButton() {
  const clearMessages = useChatStore((s) => s.clearMessages);
  const isEmpty = useChatStore((s) => s.messages.length === 0);
  const setSearching = useSearchStore((s) => s.setSearching);
  const clear = () => {
    clearMessages();
    setSearching(false);
  };
  return (
    <button
      type="button"
      onClick={clear}
      disabled={isEmpty}
      aria-label="Clear chat"
      title="Clear chat"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-line px-2.5 text-xs font-medium text-text-muted transition-colors hover:bg-slate-100 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Eraser className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Clear</span>
    </button>
  );
}
