import { useId } from "react";
import { StatusDot } from "./StatusDot";

// RecruitBot logo: an indigo -> pink gradient circle.
export function BrandLogo({ size = 36 }: { size?: number }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill={`url(#${gradientId})`} />
      <path d="M11 22c2 2.5 4.3 3.5 7 3.5s5-1 7-3.5M13 14.5h.01M23 14.5h.01" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BrandAvatar() {
  return (
    <div className="flex items-center gap-3">
      <BrandLogo />
      <div>
        <p className="text-sm font-semibold text-text-primary">RecruitBot</p>
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <StatusDot /> Online
        </p>
      </div>
    </div>
  );
}
