"use client";

import { useEffect, useState } from "react";

import { api, type AdminEvent, type AdminPage } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { eventLabel, eventTone, EVENT_LABELS, formatDateTime } from "./format";
import { Badge, ErrorLine, inputClass, Pager } from "./ui";

const PAGE_SIZE = 100;

/** The event table, reused on the user page. */
export function EventTable({ events }: { events: AdminEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="px-4 py-6 text-[14px] text-[var(--text-muted)]">
        Nothing recorded.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          <tr>
            <th className="px-4 py-2 font-semibold">When</th>
            <th className="px-4 py-2 font-semibold">Event</th>
            <th className="px-4 py-2 font-semibold">Email</th>
            <th className="px-4 py-2 font-semibold">IP</th>
            <th className="px-4 py-2 font-semibold">Detail</th>
            <th className="px-4 py-2 font-semibold">Browser</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-[var(--border)]">
              <td className="whitespace-nowrap px-4 py-2">
                {formatDateTime(event.created_at)}
              </td>
              <td className="px-4 py-2">
                <Badge className={eventTone(event.event_type)}>
                  {eventLabel(event.event_type)}
                </Badge>
              </td>
              <td className="px-4 py-2">{event.email ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2 font-mono text-[12px]">
                {event.ip_address ?? "—"}
              </td>
              <td className="px-4 py-2">{event.detail ?? ""}</td>
              <td
                className="max-w-[220px] truncate px-4 py-2 text-[var(--text-muted)]"
                title={event.user_agent ?? ""}
              >
                {event.user_agent ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityTab() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [type, setType] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminPage<AdminEvent> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api.admin
      .events(
        { q: applied, event_type: type, offset },
        controller.signal,
      )
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
  }, [applied, type, offset]);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setApplied(query.trim());
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email or IP address"
          aria-label="Search by email or IP address"
          className={`${inputClass} w-full sm:w-80`}
        />

        <select
          value={type}
          onChange={(event) => {
            setOffset(0);
            setType(event.target.value);
          }}
          aria-label="Event type"
          className={inputClass}
        >
          <option value="">All events</option>
          {Object.entries(EVENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-[var(--primary-strong)] px-4 py-2 text-[14px] font-semibold text-white"
        >
          Search
        </button>
      </form>

      <ErrorLine message={error} />

      <Panel>
        {data ? (
          <EventTable events={data.items} />
        ) : (
          <p className="px-4 py-6 text-[14px]">Loading…</p>
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
