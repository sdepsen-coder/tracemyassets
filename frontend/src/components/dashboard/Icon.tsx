type IconProps = {
  name: string;
  className?: string;
};

export function Icon({ name, className = "text-[18px]" }: IconProps) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}