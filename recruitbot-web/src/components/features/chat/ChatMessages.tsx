import { useEffect, useRef } from "react";
import { LoadingDots } from "@/components/common/LoadingDots";
import { useChat } from "@/hooks/use-chat";
import { BotBubble } from "./BotBubble";
import { UserBubble } from "./UserBubble";
import { WelcomeMessage } from "./WelcomeMessage";

// Scrollable thread. The welcome message is always first, so it reappears
// after the thread is cleared.
export function ChatMessages() {
  const { messages, isSearching } = useChat();
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
            <LoadingDots />
          </BotBubble>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
