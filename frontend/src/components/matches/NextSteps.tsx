"use client";

import { useEffect, useState } from "react";

import type { MatchRecord } from "@/lib/api";
import {
  buildLetters,
  formatLetterDate,
  letterUrl,
  type LetterKind,
} from "@/lib/matchLetters";

const NAME_KEY = "tma_letter_name";

type Props = {
  match: MatchRecord;
  artworkTitle: string;
};

function readName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(value: string) {
  try {
    window.localStorage.setItem(NAME_KEY, value);
  } catch {
    // Storage may be blocked; the name then lasts for this visit only.
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

const STEPS: Array<{ title: string; text: string }> = [
  {
    title: "Look first",
    text: "Open the source and compare it with your original. Similar is not always copied: it can be another artist, or a use you licensed. Tell us with the buttons under the card if the result was wrong.",
  },
  {
    title: "Keep evidence",
    text: "Take a screenshot that shows the page address and today's date, and save the link. Keep your original file and your protected copy untouched. Do not edit the evidence.",
  },
  {
    title: "Start with the gentlest step that can work",
    text: "A polite message often ends it. If there is no answer, report it to the platform, then to the website's host. You send everything from your own account; TraceMyAssets never contacts anyone for you.",
  },
  {
    title: "Know when to ask a professional",
    text: "For large, commercial or repeated use, talk to a lawyer or an artists' rights organisation in your country. These pages are practical help, not legal advice.",
  },
];

export function NextSteps({ match, artworkTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [active, setActive] = useState<LetterKind>("friendly");
  const [copied, setCopied] = useState<LetterKind | null>(null);

  useEffect(() => {
    if (open) setName(readName());
  }, [open]);

  const url = letterUrl(match);

  if (match.source_locked || !url) return null;

  const letters = open
    ? buildLetters({
        artworkTitle,
        url,
        platform: match.source_name,
        foundOn: formatLetterDate(match.found_at),
        watermarkVerified: match.watermark_matches_reference,
        yourName: name,
      })
    : [];
  const letter = letters.find((item) => item.kind === active) ?? letters[0];

  async function handleCopy() {
    if (!letter) return;

    if (await copyText(`Subject: ${letter.subject}\n\n${letter.body}`)) {
      setCopied(letter.kind);
      window.setTimeout(() => setCopied(null), 2000);
    }
  }

  return (
    <details
      data-testid="next-steps"
      className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-[13px]"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none font-semibold text-[var(--text)]">
        <span className="inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">
            help
          </span>
          What can I do about this?
        </span>
      </summary>

      {open && letter ? (
        <div className="mt-4 space-y-5">
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[12px] font-bold text-[var(--primary)]">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-[var(--text)]">
                    {step.title}
                  </p>
                  <p className="leading-5 text-[var(--text-muted)]">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <p className="font-semibold text-[var(--text)]">
              Letters you can copy
            </p>

            <label className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
              Your name for the letters
              <input
                type="text"
                value={name}
                data-testid="letter-name"
                maxLength={80}
                onChange={(event) => {
                  setName(event.target.value);
                  saveName(event.target.value);
                }}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[13px] text-[var(--text)]"
              />
            </label>

            <div role="tablist" className="flex flex-wrap gap-2">
              {letters.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  role="tab"
                  aria-selected={item.kind === letter.kind}
                  onClick={() => setActive(item.kind)}
                  className={[
                    "inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold transition",
                    item.kind === letter.kind
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p className="text-[12px] text-[var(--text-muted)]">
              {letter.hint}
            </p>

            <textarea
              readOnly
              data-testid="letter-body"
              aria-label={letter.label}
              value={`Subject: ${letter.subject}\n\n${letter.body}`}
              rows={14}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-[12px] leading-5 text-[var(--text)]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="letter-copy"
                onClick={() => void handleCopy()}
                className="inline-flex h-9 items-center rounded-lg bg-[var(--primary-strong)] px-3 text-[12px] font-semibold text-white transition hover:brightness-110"
              >
                {copied === letter.kind ? "Copied" : "Copy letter"}
              </button>

              <a
                href={`mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(letter.body)}`}
                className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
              >
                Open in email app
              </a>
            </div>

            <p className="text-[12px] leading-5 text-[var(--text-muted)]">
              Fill in the parts in [square brackets] and send only what is
              true: the report and host letters state that you own the
              rights and that your information is accurate. Each platform
              also has its own form; paste the text into it. These are
              starting points, not legal advice.
            </p>
          </div>
        </div>
      ) : null}
    </details>
  );
}
