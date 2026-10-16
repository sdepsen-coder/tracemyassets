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
 * Iridescent "glass object" artwork. Until the generated glass images are
 * added (design/stitch-prompts.md, section G), it is drawn with CSS: soft
 * prismatic blobs behind a frosted pane with a thin outline icon. Pass `src`
 * to show a real image instead.
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
      <span className="absolute left-[8%] top-[14%] h-[58%] w-[58%] rounded-full bg-[#c9c3f5] opacity-70 blur-2xl" />
      <span className="absolute bottom-[10%] right-[6%] h-[52%] w-[52%] rounded-full bg-[#bfd9f7] opacity-80 blur-2xl" />
      <span className="absolute right-[24%] top-[6%] h-[34%] w-[34%] rounded-full bg-[#f3d9ec] opacity-80 blur-xl" />

      <div className="glass-float absolute inset-[16%] flex items-center justify-center rounded-[28%] border border-white/80 bg-white/35 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_30px_60px_-20px_rgb(80_70_160/0.35)] backdrop-blur-md">
        <span className="absolute inset-[6%] rounded-[26%] border border-white/50" />
        <span className="absolute -left-1 top-[18%] h-[40%] w-[3px] rounded-full bg-white/80 blur-[1px]" />
        <Icon name={MOTIF_ICON[motif]} className={`${iconSize} font-extralight text-[#5b5590]`} />
      </div>
    </div>
  );
}
