type IconProps = {
  name: string;
  className?: string;
};

// Icons are decoration next to a text label, so they are hidden from screen
// readers (otherwise the icon name, such as "shield", is read aloud).
// The icon class sets its own font-size, so the size is also set inline.
function sizeFrom(className: string): string | undefined {
  return className.match(/(?:^|\s)text-\[(\d+(?:\.\d+)?px)\]/)?.[1];
}

export function Icon({ name, className = "text-[18px]" }: IconProps) {
  const size = sizeFrom(className);

  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  );
}
