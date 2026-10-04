import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export function Slider({ className, "aria-label": ariaLabel, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex h-5 w-full touch-none select-none items-center", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/[0.1]">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        className="block h-4 w-4 rounded-full border-2 border-primary bg-text-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </SliderPrimitive.Root>
  );
}
