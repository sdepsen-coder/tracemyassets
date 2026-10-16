"use client";

import { useEffect, useState } from "react";

import {
  api,
  type AdminPage,
  type AdminUserFilters,
  type AdminUserRow,
} from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import {
  formatDateTime,
  subscriptionLabel,
  subscriptionTone,
} from "./format";
import { Badge, ErrorLine, inputClass, Pager } from "./ui";
import { UserDetailView } from "./UserDetail";

const PAGE_SIZE = 50;

const PLAN_FILTERS = ["Free", "Pro", "Extra", "Internal"];

// Values the server accepts for ?subscription= (see admin.py).
const SUBSCRIPTION_FILTERS: Array<[string, string]> = [
  ["active", "Active"],
  ["canceling", "Cancels at period end"],
  ["past_due", "Payment failed"],
  ["paused", "Paused"],
  ["canceled", "Canceled"],
  ["none", "No subscription"],
];

type Filters = Omit<AdminUserFilters, "offset">;

function SubscriptionCell({ user }: { user: AdminUserRow }) {
  if (!user.subscription_status) {
    return <span className="text-[var(--text-muted)]">—</span>;
  }

  const cancelling = Boolean(user.cancels_at);

  return (
    <span className="flex flex-wrap items-center gap-1">
      <Badge className={subscriptionTone(user.subscription_status, cancelling)}>
        {cancelling ? "Cancelling" : subscriptionLabel(user.subscription_status)}
      </Badge>
      {user.subscription_interval && (
        <span className="text-[12px] text-[var(--text-muted)]">
          {user.subscription_interval === "year" ? "yearly" : "monthly"}
        </span>
      )}
    </span>
  );
}

export function UsersTab() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminPage<AdminUserRow> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected !== null) return;

    const controller = new AbortController();

    api.admin
      .users({ ...filters, offset }, controller.signal)
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
  }, [filters, offset, selected]);

  function filterBy(change: Filters) {
    setOffset(0);
    setFilters((before) => ({ ...before, ...change }));
  }

  if (selected !== null) {
    return (
      <UserDetailView userId={selected} onBack={() => setSelected(null)} />
    );
  }

  const filtered = Boolean(
    filters.q || filters.plan || filters.subscription || filters.paid,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            filterBy({ q: query.trim() || undefined });
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by email"
            aria-label="Search users by email"
            className={`${inputClass} w-full sm:w-72`}
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary-strong)] px-4 py-2 text-[14px] font-semibold text-white"
          >
            Search
          </button>
        </form>

        <select
          aria-label="Filter by plan"
          value={filters.plan ?? ""}
          onChange={(event) =>
            filterBy({ plan: event.target.value || undefined })
          }
          className={inputClass}
        >
          <option value="">All plans</option>
          {PLAN_FILTERS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by subscription"
          value={filters.subscription ?? ""}
          onChange={(event) =>
            filterBy({ subscription: event.target.value || undefined })
          }
          className={inputClass}
        >
          <option value="">Any subscription</option>
          {SUBSCRIPTION_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by payments"
          value={filters.paid ?? ""}
          onChange={(event) =>
            filterBy({
              paid: (event.target.value || undefined) as Filters["paid"],
            })
          }
          className={inputClass}
        >
          <option value="">Paid or not</option>
          <option value="true">Has paid</option>
          <option value="false">Never paid</option>
        </select>

        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOffset(0);
              setFilters({});
            }}
            className="px-2 py-2 text-[13px] text-[var(--primary)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <ErrorLine message={error} />

      <Panel className="overflow-x-auto">
        {!data ? (
          <p className="px-4 py-6 text-[14px]">Loading…</p>
        ) : (
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Plan</th>
                <th className="px-4 py-2 font-semibold">Subscription</th>
                <th className="px-4 py-2 font-semibold">Renews / ends</th>
                <th className="px-4 py-2 font-semibold">Credits</th>
                <th className="px-4 py-2 font-semibold">Artworks</th>
                <th className="px-4 py-2 font-semibold">Joined</th>
                <th className="px-4 py-2 font-semibold">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)]"
                >
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setSelected(user.id)}
                      className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      {user.email}
                    </button>{" "}
                    {user.suspended && (
                      <Badge className="bg-[var(--danger-soft)] text-[var(--danger)]">
                        Suspended
                      </Badge>
                    )}
                    {user.is_admin && (
                      <Badge className="bg-[var(--primary-soft)] text-[var(--primary)]">
                        Admin
                      </Badge>
                    )}
                    {!user.email_verified && (
                      <Badge className="bg-[var(--warning-soft)] text-[var(--warning)]">
                        Unconfirmed
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">{user.plan_type}</td>
                  <td className="px-4 py-2">
                    <SubscriptionCell user={user} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {user.cancels_at ? (
                      <span className="text-[var(--warning)]">
                        Ends {formatDateTime(user.cancels_at)}
                      </span>
                    ) : (
                      formatDateTime(user.renews_at)
                    )}
                  </td>
                  <td className="px-4 py-2">{user.credits}</td>
                  <td className="px-4 py-2">{user.assets}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {formatDateTime(user.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {formatDateTime(user.last_sign_in)}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-[var(--text-muted)]"
                  >
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
