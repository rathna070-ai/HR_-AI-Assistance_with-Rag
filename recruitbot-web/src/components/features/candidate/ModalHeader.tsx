import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function ModalHeader({ name, title, company }: { name: string; title?: string; company?: string }) {
  const meta = [title, company].filter(Boolean).join(" · ");
  return (
    <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/[0.07] bg-bg-surface px-6 py-4">
      <div className="min-w-0 flex-1">
        <DialogPrimitive.Title asChild>
          <h2 className="text-lg font-semibold text-text-primary">{name}</h2>
        </DialogPrimitive.Title>
        <DialogPrimitive.Description asChild>
          <span className="text-sm text-text-muted">{meta || "Candidate profile"}</span>
        </DialogPrimitive.Description>
      </div>
      <DialogPrimitive.Close className="rounded-md p-1.5 text-text-muted hover:bg-white/[0.06] hover:text-text-primary" aria-label="Close profile">
        <X className="h-5 w-5" aria-hidden />
      </DialogPrimitive.Close>
    </div>
  );
}
