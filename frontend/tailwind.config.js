/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark is the default; only the "light" class turns it off (globals.css).
  darkMode: ["variant", "&:not(.light *)"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-heading)", "Arial", "sans-serif"],
        heading: ["var(--font-heading)", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        card: "0 20px 40px -24px rgba(0, 0, 0, 0.55)",
        floating:
          "0 24px 48px -16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 210, 255, 0.06)",
      },
    },
  },
  plugins: [],
};