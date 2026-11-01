"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/**
 * A normal link that also sends a `cta_click` event to Google Analytics.
 * The event is only sent when the visitor accepted analytics (gtag is
 * loaded after consent), so nothing is tracked otherwise.
 */
export function TrackedLink({
  placement,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  /** Where the link sits, for example "header" or "post-end". */
  placement: string;
}) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        try {
          (window as unknown as GtagWindow).gtag?.("event", "cta_click", {
            placement,
            destination: typeof props.href === "string" ? props.href : undefined,
            page_path: window.location.pathname,
          });
        } catch {
          // Tracking must never block a click.
        }
        onClick?.(event);
      }}
    />
  );
}
