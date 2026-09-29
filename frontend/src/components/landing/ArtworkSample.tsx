/**
 * Abstract, generated artwork used only to illustrate the product on the
 * landing page. It is drawn in SVG so no image assets are needed and it is
 * clearly not anyone's real work.
 */
export function ArtworkSample({
  id,
  variant,
  className = "",
}: {
  id: string;
  variant: "original" | "copy";
  className?: string;
}) {
  const warm = variant === "original";

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="Abstract illustrative artwork"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={warm ? "#ffd6a5" : "#f6d3b0"} />
          <stop offset="1" stopColor={warm ? "#f4a6b8" : "#e8a3ae"} />
        </linearGradient>
        <linearGradient id={`${id}-hill1`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b6cff" />
          <stop offset="1" stopColor="#2a2f8f" />
        </linearGradient>
        <linearGradient id={`${id}-hill2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fb59a" />
          <stop offset="1" stopColor="#146a63" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${id}-sky)`} />
      <circle cx="285" cy="95" r="46" fill="#fff4dc" opacity="0.9" />
      <circle cx="285" cy="95" r="70" fill="#fff4dc" opacity="0.25" />
      <path
        d="M0 210 C70 150 130 160 200 195 C270 230 330 170 400 150 L400 300 L0 300 Z"
        fill={`url(#${id}-hill1)`}
      />
      <path
        d="M0 250 C80 205 150 225 230 245 C300 262 350 225 400 215 L400 300 L0 300 Z"
        fill={`url(#${id}-hill2)`}
      />
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" fill="none">
        <path d="M40 120 q20 -22 40 0" />
        <path d="M70 92 q14 -16 28 0" />
        <path d="M150 70 q18 -20 36 0" />
      </g>
    </svg>
  );
}
