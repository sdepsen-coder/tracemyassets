"use client";

import { useTheme } from "next-themes";

type ThemeName = "light" | "dark" | "system";

const themeOptions: Array<{
  value: ThemeName;
  label: string;
  icon: string;
}> = [
  {
    value: "light",
    label: "Light theme",
    icon: "light_mode",
  },
  {
    value: "dark",
    label: "Dark theme",
    icon: "dark_mode",
  },
  {
    value: "system",
    label: "Use system theme",
    icon: "desktop_windows",
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      aria-label="Theme preference"
      className="hidden items-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1 md:flex"
    >
      {themeOptions.map((option) => {
        const selected = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            aria-label={option.label}
            aria-pressed={selected}
            onClick={() => setTheme(option.value)}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-md transition",
              selected
                ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
            ].join(" ")}
          >
            <span className="material-symbols-outlined text-[18px]">
              {option.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}