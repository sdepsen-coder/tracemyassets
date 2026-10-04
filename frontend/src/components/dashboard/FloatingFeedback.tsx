"use client";

import { useState } from "react";

import { FeedbackDialog } from "./FeedbackDialog";
import { Icon } from "./Icon";

/**
 * The one feedback entry point: a small button fixed to the bottom-left of
 * every signed-in page, so it is always in reach and nowhere else needs a link.
 */
export function FloatingFeedback() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        title="Send feedback"
        className="fixed bottom-4 left-4 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary-strong)] px-4 text-[13px] font-semibold text-white shadow-lg transition hover:brightness-110"
      >
        <Icon name="chat_bubble" />
        <span>Feedback</span>
      </button>

      <FeedbackDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
