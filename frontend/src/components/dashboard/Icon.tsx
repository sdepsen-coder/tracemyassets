type IconProps = {
  name: string;
  className?: string;
};

// The Material Symbols stylesheet sets its own font-size and loads after our
// CSS, so a "text-[NNpx]" class alone can lose. The size is also set inline.
function sizeFrom(className: string): string | undefined {
  return className.match(/(?:^|\s)text-\[(\d+(?:\.\d+)?px)\]/)?.[1];
}

export function Icon({ name, className = "text-[18px]" }: IconProps) {
  const size = sizeFrom(className);

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  );
}
