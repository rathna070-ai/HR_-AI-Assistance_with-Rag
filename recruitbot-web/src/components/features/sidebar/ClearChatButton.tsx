import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/stores/chat.store";

// Clearing the thread brings back the welcome message (rendered when empty).
export function ClearChatButton() {
  const clearMessages = useChatStore((s) => s.clearMessages);
  return (
    <Button variant="outline" className="w-full" onClick={clearMessages} aria-label="Clear chat">
      <X className="h-4 w-4" aria-hidden />
      Clear chat
    </Button>
  );
}
