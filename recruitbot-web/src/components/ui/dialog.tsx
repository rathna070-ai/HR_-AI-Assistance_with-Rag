import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

// Radix Dialog: focus trap, Escape to close and overlay click to close are built in.
export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/[0.07] bg-bg-surface shadow-2xl focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
