import { m } from "framer-motion";
import { formatTime } from "@/lib/utils/formatters";

export function UserBubble({ text, timestamp }: { text: string; timestamp: Date }) {
  return (
    <m.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end" data-testid="user-bubble">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm text-white">
        <p className="whitespace-pre-wrap break-words">{text}</p>
        <p className="mt-1 text-right text-[11px] text-white/85">{formatTime(timestamp)}</p>
      </div>
    </m.div>
  );
}
