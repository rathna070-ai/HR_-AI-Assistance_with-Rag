import type { Ref, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Textarea({ className, ref, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
