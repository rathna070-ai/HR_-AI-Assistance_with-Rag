import markUrl from "@/assets/brand/talentlens-mark.webp";
import wordmarkUrl from "@/assets/brand/talentlens-wordmark.webp";
import { StatusDot } from "./StatusDot";

// TalentLens AI logo mark (magnifier over a profile card).
export function BrandLogo({ size = 36 }: { size?: number }) {
  return <img src={markUrl} width={size} height={size} alt="" aria-hidden className="shrink-0" />;
}

// Full logo with the product name, shown at the top of the sidebar.
export function BrandWordmark({ height = 40 }: { height?: number }) {
  return <img src={wordmarkUrl} height={height} width={Math.round(height * 4.01)} alt="TalentLens AI" />;
}

export function BrandAvatar() {
  return (
    <div className="flex flex-col gap-1.5">
      <BrandWordmark />
      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <StatusDot /> Online
      </p>
    </div>
  );
}
