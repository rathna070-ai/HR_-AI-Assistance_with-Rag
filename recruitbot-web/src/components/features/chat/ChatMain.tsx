import { useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { ChatInputBar } from "./ChatInputBar";
import { ChatMessages } from "./ChatMessages";
import { ChatTopbar } from "./ChatTopbar";
import { SuggestionChips } from "./SuggestionChips";

// Topbar + thread + suggestion chips (empty thread only) + input bar.
export function ChatMain({ onSubmit }: { onSubmit: (query: string) => void }) {
  const { isEmpty, isSearching } = useChat();
  const [input, setInput] = useState("");

  const submit = (query: string) => {
    if (!query.trim() || isSearching) return;
    setInput("");
    onSubmit(query.trim());
  };

  // A chip fills the input with its query and submits it.
  const pick = (query: string) => {
    setInput(query);
    submit(query);
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col" data-testid="chat-main">
      <ChatTopbar />
      <ChatMessages />
      {isEmpty && (
        <div className="px-4 pb-2 md:px-8">
          <div className="mx-auto max-w-3xl">
            <SuggestionChips onPick={pick} disabled={isSearching} />
          </div>
        </div>
      )}
      <ChatInputBar value={input} onChange={setInput} onSubmit={submit} disabled={isSearching} />
    </main>
  );
}
