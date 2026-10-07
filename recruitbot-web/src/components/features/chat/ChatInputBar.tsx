import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import { ClearChatButton } from "./ClearChatButton";
import { Textarea } from "@/components/ui/textarea";
import { MAX_QUERY_CHARS, QUERY_COUNTER_FROM } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

const MAX_LINES = 6;
const LINE_HEIGHT_PX = 20;
const formatCount = (n: number) => n.toLocaleString("en-US");

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export function ChatInputBar({ value, onChange, onSubmit, disabled }: ChatInputBarProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // The backend rejects longer queries, so they are stopped here with a message.
  const length = value.trim().length;
  const tooLong = length > MAX_QUERY_CHARS;
  const canSend = length > 0 && !tooLong && !disabled;

  // Grow from 1 to 6 lines with the content, then scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_LINES * LINE_HEIGHT_PX)}px`;
  }, [value]);

  const submit = () => {
    if (canSend) onSubmit(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-line px-4 py-3 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg-card px-3 py-2 focus-within:border-primary/40">
          <Textarea
            ref={ref}
            id="search-query"
            name="query"
            autoComplete="off"
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe the candidate you need, e.g. Selenium tester with 3 years of experience"
            aria-label="Search query"
            aria-invalid={tooLong}
            aria-describedby={length >= QUERY_COUNTER_FROM ? "query-length" : undefined}
            className="max-h-[120px] py-1.5 leading-5"
          />
          <ClearChatButton />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-accent text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {length >= QUERY_COUNTER_FROM && (
          <p
            id="query-length"
            className={cn("mt-1.5 text-xs", tooLong ? "font-medium text-red-600" : "text-text-muted")}
            role={tooLong ? "alert" : undefined}
            data-testid="query-length"
          >
            {tooLong
              ? `Query is too long (${formatCount(length)} / ${formatCount(MAX_QUERY_CHARS)} characters). Shorten it to search.`
              : `${formatCount(length)} / ${formatCount(MAX_QUERY_CHARS)} characters`}
          </p>
        )}
        <p className="mt-1.5 text-center text-[11px] text-text-muted">Press Enter to search · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
