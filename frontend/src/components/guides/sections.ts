/** The two sections that share the post layout. */
export type Section = {
  key: "guides" | "blog";
  /** Name in breadcrumbs and the menu. */
  label: string;
  base: string;
  /** Heading of the side list on a post page. */
  sideTitle: string;
  allLabel: string;
};

export const GUIDES_SECTION: Section = {
  key: "guides",
  label: "Guides",
  base: "/guides",
  sideTitle: "More guides",
  allLabel: "All guides",
};

export const BLOG_SECTION: Section = {
  key: "blog",
  label: "Blog",
  base: "/blog",
  sideTitle: "More from the blog",
  allLabel: "All blog posts",
};
