import type { ReactNode } from "react";
import { create } from "zustand";
import type { Message } from "@/types/chat.types";

interface ChatState {
  messages: Message[];
  addUserMessage: (text: string) => void;
  addBotMessage: (content: ReactNode) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  addUserMessage: (text) =>
    set((s) => ({
      messages: [...s.messages, { id: crypto.randomUUID(), type: "user", text, timestamp: new Date() }],
    })),
  addBotMessage: (content) =>
    set((s) => ({
      messages: [...s.messages, { id: crypto.randomUUID(), type: "bot", content, timestamp: new Date() }],
    })),
  clearMessages: () => set({ messages: [] }),
}));
