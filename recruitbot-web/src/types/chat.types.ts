import type { ReactNode } from "react";

export type MessageType = "user" | "bot";

export type Message =
  { id: string; type: "user"; text: string; timestamp: Date } | { id: string; type: "bot"; content: ReactNode; timestamp: Date };
