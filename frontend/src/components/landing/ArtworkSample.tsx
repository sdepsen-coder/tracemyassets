/**
 * Generated artwork used only to illustrate the product on the public pages.
 * Drawn in SVG, so no image files are needed and it is clearly not anyone's
 * real work. Four different pictures, so the page shows colour and variety
 * the way an artist's own catalogue would.
 */
export type ArtName = "hills" | "city" | "botanic" | "shapes";

export function ArtworkSample({
  id,
  art = "hills",
  variant = "original",
  className = "",
}: {
  id: string;
  art?: ArtName;
  /** "copy" shifts the colours slightly, like a re-saved image. */
  variant?: "original" | "copy";
  className?: string;
}) {
  const copy = variant === "copy";

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="Generated illustrative artwork"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      style={copy ? { filter: "saturate(0.82) hue-rotate(-8deg)" } : undefined}
    >
      {art === "hills" && (
        <>
          <defs>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffd6a5" />
              <stop offset="1" stopColor="#f4a6b8" />
            </linearGradient>
            <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b6cff" />
              <stop offset="1" stopColor="#2a2f8f" />
            </linearGradient>
            <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2fb59a" />
              <stop offset="1" stopColor="#146a63" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#${id}-a)`} />
          <circle cx="285" cy="95" r="46" fill="#fff4dc" opacity="0.9" />
          <circle cx="285" cy="95" r="70" fill="#fff4dc" opacity="0.25" />
          <path d="M0 210 C70 150 130 160 200 195 C270 230 330 170 400 150 L400 300 L0 300 Z" fill={`url(#${id}-b)`} />
          <path d="M0 250 C80 205 150 225 230 245 C300 262 350 225 400 215 L400 300 L0 300 Z" fill={`url(#${id}-c)`} />
          <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" fill="none">
            <path d="M40 120 q20 -22 40 0" />
            <path d="M70 92 q14 -16 28 0" />
            <path d="M150 70 q18 -20 36 0" />
          </g>
        </>
      )}

      {art === "city" && (
        <>
          <defs>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1b1040" />
              <stop offset="0.55" stopColor="#7a1f8f" />
              <stop offset="1" stopColor="#ff5d8f" />
            </linearGradient>
            <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd166" />
              <stop offset="1" stopColor="#ff5d8f" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill={`url(#${id}-a)`} />
          <circle cx="200" cy="190" r="78" fill={`url(#${id}-b)`} />
          <g fill="#1b1040" opacity="0.55">
            <rect x="150" y="196" width="100" height="5" />
            <rect x="138" y="212" width="124" height="6" />
            <rect x="128" y="230" width="144" height="8" />
          </g>
          <g fill="#140a33">
            <rect x="0" y="170" width="46" height="130" />
            <rect x="52" y="120" width="38" height="180" />
            <rect x="96" y="190" width="44" height="110" />
            <rect x="262" y="150" width="40" height="150" />
            <rect x="308" y="100" width="44" height="200" />
            <rect x="358" y="180" width="42" height="120" />
          </g>
          <g fill="#59f0ff">
            <rect x="60" y="134" width="6" height="8" />
            <rect x="74" y="160" width="6" height="8" />
            <rect x="60" y="190" width="6" height="8" />
            <rect x="318" y="118" width="6" height="8" />
            <rect x="334" y="150" width="6" height="8" />
            <rect x="318" y="186" width="6" height="8" />
            <rect x="272" y="170" width="6" height="8" />
            <rect x="12" y="192" width="6" height="8" />
          </g>
          <g fill="#ffd166">
            <rect x="74" y="210" width="6" height="8" />
            <rect x="334" y="214" width="6" height="8" />
            <rect x="286" y="200" width="6" height="8" />
            <rect x="110" y="212" width="6" height="8" />
            <rect x="372" y="204" width="6" height="8" />
          </g>
          <rect x="0" y="262" width="400" height="38" fill="#0c0626" />
          <path d="M0 262 H400" stroke="#ff5d8f" strokeWidth="2" opacity="0.8" />
        </>
      )}

      {art === "botanic" && (
        <>
          <rect width="400" height="300" fill="#f3ead7" />
          <circle cx="300" cy="80" r="60" fill="#f2b56b" />
          <g fill="none" strokeLinecap="round">
            <path d="M200 300 C200 220 190 170 160 110" stroke="#1f5c45" strokeWidth="6" />
            <path d="M205 300 C215 230 240 190 290 150" stroke="#2f7d5c" strokeWidth="5" />
            <path d="M195 300 C180 250 140 230 90 220" stroke="#2f7d5c" strokeWidth="5" />
          </g>
          <g fill="#2f7d5c">
            <path d="M160 110 C120 100 96 64 100 30 C140 40 168 70 160 110Z" />
            <path d="M172 150 C210 130 232 96 226 60 C190 76 166 112 172 150Z" fill="#1f5c45" />
            <path d="M290 150 C330 150 360 126 370 92 C330 92 298 114 290 150Z" />
            <path d="M90 220 C56 226 28 210 14 182 C50 174 80 190 90 220Z" fill="#1f5c45" />
            <path d="M150 232 C128 198 96 184 62 190 C80 222 114 240 150 232Z" />
            <path d="M246 214 C276 196 312 200 334 224 C302 240 268 238 246 214Z" fill="#3f9b74" />
          </g>
          <g fill="#d9534f">
            <circle cx="118" cy="140" r="9" />
            <circle cx="262" cy="118" r="7" />
            <circle cx="56" cy="250" r="8" />
          </g>
        </>
      )}

      {art === "shapes" && (
        <>
          <rect width="400" height="300" fill="#12284a" />
          <rect x="0" y="0" width="150" height="300" fill="#f25f4c" />
          <circle cx="150" cy="150" r="96" fill="#ffd803" />
          <path d="M150 54 A96 96 0 0 1 150 246 Z" fill="#f7f1e3" />
          <rect x="262" y="40" width="98" height="98" fill="#2cb1bc" />
          <path d="M262 262 L360 262 L311 170 Z" fill="#f7f1e3" />
          <circle cx="311" cy="89" r="26" fill="#12284a" />
          <g stroke="#12284a" strokeWidth="5">
            <path d="M24 250 H126" />
            <path d="M24 268 H96" />
          </g>
        </>
      )}
    </svg>
  );
}
