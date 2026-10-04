import type { ReactNode } from "react";
import { create } from "zustand";
import type { Message } from "@/types/chat.types";

interface ChatState {
  messages: Message[];
  // Bumped by clearMessages so a search still running for the old thread can
  // tell its reply no longer belongs anywhere.
  threadId: number;
  addUserMessage: (text: string) => void;
  addBotMessage: (content: ReactNode) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  threadId: 0,
  addUserMessage: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: crypto.randomUUID(), type: "user", text, timestamp: new Date() }],
    })),
  addBotMessage: (content) =>
    set((s) => ({
      messages: [...s.messages, { id: crypto.randomUUID(), type: "bot", content, timestamp: new Date() }],
    })),
  clearMessages: () => set((s) => ({ messages: [], threadId: s.threadId + 1 })),
}));
