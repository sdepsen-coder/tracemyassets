"use client";

import { useEffect, useState } from "react";

type Item = { id: string; text: string };

/**
 * "In this guide" list built from the page's own section headings, with the
 * current section highlighted while reading. Without JavaScript it simply
 * does not show: the page reads fine without it.
 */
export function GuideToc() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("[data-guide-body] h2[id]"),
    );
    setItems(headings.map((h) => ({ id: h.id, text: h.textContent ?? "" })));
    if (headings.length === 0 || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (items.length < 3) return null;

  return (
    <nav aria-label="In this guide">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
        In this guide
      </p>
      <ul className="mt-3 space-y-2 border-l border-[var(--border)] pl-4 text-[14px] leading-snug">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={
                item.id === active
                  ? "font-medium text-[var(--text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
