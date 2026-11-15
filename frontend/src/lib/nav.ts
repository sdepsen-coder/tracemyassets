/** Links shown in the public top bar and its phone menu. */
export type NavKey = "how" | "pricing" | "guides" | "blog" | "help" | "about";

export const NAV_LINKS: Array<{ key: NavKey; href: string; label: string }> = [
  { key: "how", href: "/#how-it-works", label: "How it works" },
  { key: "pricing", href: "/pricing", label: "Pricing" },
  { key: "guides", href: "/guides", label: "Guides" },
  { key: "blog", href: "/blog", label: "Blog" },
  { key: "help", href: "/help", label: "Help" },
];
