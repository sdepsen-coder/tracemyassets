"use client";

import { useEffect, useState } from "react";

import { api, type AdminFeedbackRow, type AdminPage } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { formatDateTime } from "./format";
import { Badge, ErrorLine, inputClass, Pager } from "./ui";

const PAGE_SIZE = 50;

const KIND_LABELS: Record<string, string> = {
  match_verdict: "Match verdict",
  beta_survey: "Beta survey",
  general: "Message",
};

/** One feedback entry, reused on the user page. */
export function FeedbackItem({ row }: { row: AdminFeedbackRow }) {
  return (
    <li className="border-t border-[var(--border)] px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
        <Badge>{KIND_LABELS[row.kind] ?? row.kind}</Badge>
        <span>{formatDateTime(row.created_at)}</span>
        {row.email && <span>· {row.email}</span>}
      </div>

      {row.kind === "match_verdict" && (
        <p className="mt-1.5 text-[14px]">
          Verdict <strong>{row.verdict}</strong>
          {row.similarity_percent !== null &&
            ` · ${Math.round(row.similarity_percent)}% similar`}
          {row.overall_signal && ` · ${row.overall_signal}`}
          {row.source_kind && ` · ${row.source_kind}`}
        </p>
      )}

      {row.message && (
        <p className="mt-1.5 whitespace-pre-wrap text-[14px]">
          {row.message}
        </p>
      )}

      {row.answers && (
        <dl className="mt-1.5 space-y-0.5 text-[13px]">
          {Object.entries(row.answers).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <dt className="text-[var(--text-muted)]">{key}:</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

export function FeedbackTab() {
  const [kind, setKind] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminPage<AdminFeedbackRow> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api.admin
      .feedback({ kind, offset }, controller.signal)
      .then((page) => {
        setData(page);
        setError("");
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not load.");
        }
      });

    return () => controller.abort();
  }, [kind, offset]);

  return (
    <div className="space-y-4">
      <select
        value={kind}
        onChange={(event) => {
          setOffset(0);
          setKind(event.target.value);
        }}
        aria-label="Feedback type"
        className={inputClass}
      >
        <option value="">All feedback</option>
        {Object.entries(KIND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <ErrorLine message={error} />

      <Panel>
        {!data ? (
          <p className="px-4 py-6 text-[14px]">Loading…</p>
        ) : data.items.length === 0 ? (
          <p className="px-4 py-6 text-[14px] text-[var(--text-muted)]">
            No feedback yet.
          </p>
        ) : (
          <ul>
            {data.items.map((row) => (
              <FeedbackItem key={row.id} row={row} />
            ))}
          </ul>
        )}
      </Panel>

      {data && (
        <Pager
          total={data.total}
          offset={offset}
          pageSize={PAGE_SIZE}
          onChange={setOffset}
        />
      )}
    </div>
  );
}
