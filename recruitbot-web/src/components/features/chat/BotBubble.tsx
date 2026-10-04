import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/common/BrandAvatar";
import { formatTime } from "@/lib/utils/formatters";

export function BotBubble({ children, timestamp }: { children: ReactNode; timestamp?: Date }) {
  return (
    <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2.5" data-testid="bot-bubble">
      <div className="mt-0.5 shrink-0">
        <BrandLogo size={28} />
      </div>
      <div className="min-w-0 max-w-[92%] rounded-2xl rounded-tl-sm border border-white/[0.07] bg-bg-card px-4 py-3 text-sm text-text-primary">
        {children}
        {timestamp && <p className="mt-2 text-[11px] text-text-muted">{formatTime(timestamp)}</p>}
      </div>
    </motion.div>
  );
}
