"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/components/AuthGate";
import {
  api,
  ApiError,
  type FeedbackSubmission,
  type SurveyAnswers,
} from "@/lib/api";

type QuestionKey = keyof SurveyAnswers;

const QUESTIONS: Array<{ key: QuestionKey; label: string }> = [
  { key: "check_today", label: "How do you check for copies of your art today?" },
  { key: "would_pay", label: "What would you be willing to pay for this, monthly?" },
  { key: "if_found", label: "If you found a copy, what would you do about it?" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FeedbackDialog({ open, onClose }: Props) {
  const { logout } = useAuth();

  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const firstFieldRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    firstFieldRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function close() {
    onClose();

    // Start fresh next time, but only once a message has gone out.
    if (status === "sent") {
      setAnswers({});
      setMessage("");
      setStatus("idle");
    }

    setError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const filled: SurveyAnswers = {};

    for (const question of QUESTIONS) {
      const value = answers[question.key]?.trim();

      if (value) {
        filled[question.key] = value;
      }
    }

    const hasAnswers = Object.keys(filled).length > 0;
    const trimmedMessage = message.trim();

    if (!hasAnswers && !trimmedMessage) {
      setError("Please answer a question or write a message first.");
      return;
    }

    const submission: FeedbackSubmission = hasAnswers
      ? { kind: "beta_survey", answers: filled, message: trimmedMessage || undefined }
      : { kind: "general", message: trimmedMessage };

    setStatus("sending");
    setError("");

    try {
      await api.sendFeedback(submission);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");

      if (err instanceof ApiError && err.status === 401) {
        await logout();
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Your feedback could not be sent. Please try again.",
      );
    }
  }

  const fieldClasses =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)]";

  // Rendered into <body>: the top bar uses backdrop-blur, which would
  // otherwise make this "fixed" overlay position itself inside the bar.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-card sm:rounded-2xl sm:p-6"
      >
        {status === "sent" ? (
          <div className="py-6 text-center">
            <h2 id="feedback-title" className="text-[18px] font-semibold">
              Thank you
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-[var(--text-muted)]">
              Your feedback has been received. It genuinely shapes what gets
              built next.
            </p>

            <button
              type="button"
              onClick={close}
              className="mt-5 inline-flex h-9 items-center rounded-lg bg-[var(--primary-strong)] px-4 text-[12px] font-semibold text-white"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-[18px] font-semibold">
                  Help shape the beta
                </h2>

                <p className="mt-1 text-[13px] leading-6 text-[var(--text-muted)]">
                  Three short questions. Answer any you like, or just leave a
                  note.
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {QUESTIONS.map((question, index) => (
                <label key={question.key} className="block">
                  <span className="mb-1 block text-[12px] font-semibold">
                    {question.label}
                  </span>

                  <textarea
                    ref={index === 0 ? firstFieldRef : undefined}
                    rows={2}
                    maxLength={1000}
                    value={answers[question.key] ?? ""}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.key]: event.target.value,
                      }))
                    }
                    className={fieldClasses}
                  />
                </label>
              ))}

              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold">
                  Anything else? (optional)
                </span>

                <textarea
                  rows={3}
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="A bug, an idea, something confusing..."
                  className={fieldClasses}
                />
              </label>
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-[var(--danger-soft)] p-3 text-[13px] text-[var(--danger)]"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex h-9 items-center rounded-lg bg-[var(--primary-strong)] px-4 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
