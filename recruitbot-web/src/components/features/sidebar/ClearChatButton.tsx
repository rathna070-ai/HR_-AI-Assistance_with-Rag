import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/stores/chat.store";
import { useSearchStore } from "@/lib/stores/search.store";

// Clearing the thread brings back the welcome message (rendered when empty).
// A search still running is abandoned so the chips and input are usable again.
export function ClearChatButton() {
  const clearMessages = useChatStore((s) => s.clearMessages);
  const setSearching = useSearchStore((s) => s.setSearching);
  const clear = () => {
    clearMessages();
    setSearching(false);
  };
  return (
    <Button variant="outline" className="w-full" onClick={clear} aria-label="Clear chat">
      <X className="h-4 w-4" aria-hidden />
      Clear chat
    </Button>
  );
}
