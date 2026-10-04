import { useChatStore } from "@/lib/stores/chat.store";
import { useSearchStore } from "@/lib/stores/search.store";

// Chat thread state for components that render or manage messages.
export function useChat() {
  const { messages, addUserMessage, addBotMessage, clearMessages } = useChatStore();
  const isSearching = useSearchStore((s) => s.isSearching);
  return { messages, isSearching, isEmpty: messages.length === 0, addUserMessage, addBotMessage, clearMessages };
}
