import { m } from "framer-motion";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/common/BrandAvatar";
import { formatTime } from "@/lib/utils/formatters";

export function BotBubble({ children, timestamp, animate = true }: { children: ReactNode; timestamp?: Date; animate?: boolean }) {
  return (
    <m.div
      initial={animate ? { opacity: 0, x: -24 } : false}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2.5"
      data-testid="bot-bubble"
    >
      <div className="mt-0.5 shrink-0">
        <BrandLogo size={28} />
      </div>
      <div className="min-w-0 max-w-[92%] rounded-2xl rounded-tl-sm border border-line bg-bg-card px-4 py-3 text-sm text-text-primary">
        {children}
        {timestamp && <p className="mt-2 text-[11px] text-text-muted">{formatTime(timestamp)}</p>}
      </div>
    </m.div>
  );
}
