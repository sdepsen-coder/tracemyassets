import { Icon } from "@/components/dashboard/Icon";

type Motif = "shield" | "lens" | "frames" | "orb" | "fingerprint";

const MOTIF_ICON: Record<Motif, string> = {
  shield: "shield",
  lens: "search",
  frames: "photo_library",
  orb: "check",
  fingerprint: "fingerprint",
};

/**
 * "Glass object" artwork drawn with CSS: soft cyan and teal glows behind a
 * dark frosted tile with a thin outline icon. Pass `src` to show a real
 * image instead.
 */
export function GlassArt({
  motif,
  src,
  className = "",
  size = "md",
}: {
  motif: Motif;
  src?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = {
    sm: "h-28 w-28",
    md: "h-56 w-56",
    lg: "h-[340px] w-full max-w-[440px]",
  }[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`${box} object-contain ${className}`} />
    );
  }

  const iconSize = { sm: "text-[34px]", md: "text-[64px]", lg: "text-[96px]" }[size];

  return (
    <div aria-hidden className={`relative ${box} ${className}`}>
      <span className="absolute left-[8%] top-[14%] h-[58%] w-[58%] rounded-full bg-[#00d2ff] opacity-25 blur-3xl" />
      <span className="absolute bottom-[10%] right-[6%] h-[52%] w-[52%] rounded-full bg-[#00f5d4] opacity-20 blur-3xl" />

      <div className="glass-float glass absolute inset-[16%] flex items-center justify-center rounded-[28%] border border-[var(--border-glow)] shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_30px_60px_-20px_rgb(0_210_255/0.35)]">
        <span className="absolute inset-[6%] rounded-[26%] border border-[var(--border)]" />
        <Icon name={MOTIF_ICON[motif]} className={`${iconSize} font-extralight text-[var(--primary)]`} />
      </div>
    </div>
  );
}
