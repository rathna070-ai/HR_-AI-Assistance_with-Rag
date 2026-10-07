import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import { useSearchStore } from "@/lib/stores/search.store";
import { BotBubble } from "./BotBubble";
import { SearchProgress } from "./SearchProgress";
import { UserBubble } from "./UserBubble";
import { WelcomeMessage } from "./WelcomeMessage";

// Scrollable thread. The welcome message is always first, so it reappears
// after the thread is cleared.
export function ChatMessages() {
  const { messages, isSearching } = useChat();
  const searchingMode = useSearchStore((s) => s.searchingMode);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSearching]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8" data-testid="chat-messages">
      <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-live="polite" aria-relevant="additions">
        <WelcomeMessage />
        {messages.map((m) =>
          m.type === "user" ? (
            <UserBubble key={m.id} text={m.text} timestamp={m.timestamp} />
          ) : (
            <BotBubble key={m.id} timestamp={m.timestamp}>
              {m.content}
            </BotBubble>
          ),
        )}
        {isSearching && (
          <BotBubble>
            <SearchProgress mode={searchingMode} />
          </BotBubble>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
