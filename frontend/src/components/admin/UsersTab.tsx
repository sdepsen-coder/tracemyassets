"use client";

import { useCallback, useEffect, useState } from "react";

import {
  api,
  type AdminPage,
  type AdminUserDetail,
  type AdminUserRow,
} from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { EventTable } from "./ActivityTab";
import { FeedbackItem } from "./FeedbackTab";
import { formatDateTime } from "./format";
import {
  Badge,
  ErrorLine,
  inputClass,
  Pager,
  smallButton,
} from "./ui";

const PAGE_SIZE = 50;
// Plan names the server accepts (see PLAN_LIMITS on the backend).
const PLANS = ["Free", "Pro", "Extra", "Internal"];

function UserDetailView({
  userId,
  onBack,
}: {
  userId: number;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [credits, setCredits] = useState("5");
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState("Free");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await api.admin.user(userId, signal);
        setDetail(result);
        setPlan(result.user.plan_type);
        setError("");
      } catch (err) {
        if (!signal?.aborted) {
          setError(err instanceof Error ? err.message : "Could not load.");
        }
      }
    },
    [userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => controller.abort();
  }, [load]);

  async function act(
    action: string,
    body: object,
    done: string,
  ): Promise<void> {
    setBusy(true);
    setError("");
    setNotice("");
    setConfirming(null);

    try {
      await api.admin.act(userId, action, body);
      setNotice(done);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={onBack} className={smallButton}>
          ← All users
        </button>
        {error ? <ErrorLine message={error} /> : <p>Loading…</p>}
      </div>
    );
  }

  const { user } = detail;

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className={smallButton}>
        ← All users
      </button>

      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-[20px] font-bold">{user.email}</h2>
          <Badge>{user.plan_type}</Badge>
          {user.is_admin && (
            <Badge className="bg-[var(--primary-soft)] text-[var(--primary)]">
              Admin
            </Badge>
          )}
          {user.suspended && (
            <Badge className="bg-[var(--danger-soft)] text-[var(--danger)]">
              Suspended
            </Badge>
          )}
          {!user.email_verified && (
            <Badge className="bg-[var(--warning-soft)] text-[var(--warning)]">
              Email not confirmed
            </Badge>
          )}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-[var(--text-muted)]">Joined</dt>
            <dd>{formatDateTime(user.created_at)}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Last sign-in</dt>
            <dd>{formatDateTime(user.last_sign_in)}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Credits</dt>
            <dd>{user.credits}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Artworks</dt>
            <dd>{user.assets}</dd>
          </div>
        </dl>

        {user.suspended && detail.suspension_reason && (
          <p className="mt-3 text-[13px] text-[var(--danger)]">
            Reason: {detail.suspension_reason}
          </p>
        )}
      </Panel>

      <ErrorLine message={error} />
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[13px] text-[var(--success)]"
        >
          {notice}
        </p>
      )}

      <Panel className="space-y-4 p-5">
        <h3 className="font-heading text-[16px] font-semibold">Actions</h3>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void act(
              "credits",
              { amount: Number(credits), note: note.trim() || null },
              `Added ${credits} credit(s).`,
            );
          }}
        >
          <label className="text-[12px] text-[var(--text-muted)]">
            Add credits
            <input
              type="number"
              min={1}
              max={1000}
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
              className={`${inputClass} mt-1 block w-24`}
            />
          </label>
          <label className="text-[12px] text-[var(--text-muted)]">
            Note (optional)
            <input
              value={note}
              maxLength={300}
              onChange={(event) => setNote(event.target.value)}
              className={`${inputClass} mt-1 block w-64`}
            />
          </label>
          <button type="submit" disabled={busy} className={smallButton}>
            Add credits
          </button>
        </form>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void act("plan", { plan_type: plan }, `Plan is now ${plan}.`);
          }}
        >
          <label className="text-[12px] text-[var(--text-muted)]">
            Plan
            <select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              className={`${inputClass} mt-1 block`}
            >
              {PLANS.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy || plan === user.plan_type}
            className={smallButton}
          >
            Change plan
          </button>
        </form>

        {!user.email_verified && (
          <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("verify-email", {}, "Email marked as confirmed.")
              }
              className={smallButton}
            >
              Mark email as confirmed
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-4">
          {confirming === "revoke" ? (
            <>
              <span className="text-[13px]">
                Sign this person out everywhere?
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act("revoke-sessions", {}, "Signed out everywhere.")
                }
                className={`${smallButton} border-[var(--danger)] text-[var(--danger)]`}
              >
                Yes, sign out
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className={smallButton}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming("revoke")}
              className={smallButton}
            >
              Sign out everywhere
            </button>
          )}
        </div>

        {!user.is_admin && (
          <div className="flex flex-wrap items-end gap-2">
            {user.suspended ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act("unsuspend", {}, "Suspension lifted.")
                }
                className={smallButton}
              >
                Lift suspension
              </button>
            ) : confirming === "suspend" ? (
              <>
                <input
                  value={reason}
                  maxLength={300}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason (optional)"
                  aria-label="Reason for suspending"
                  className={`${inputClass} w-64`}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      "suspend",
                      { reason: reason.trim() || null },
                      "Account suspended.",
                    )
                  }
                  className={`${smallButton} border-[var(--danger)] text-[var(--danger)]`}
                >
                  Suspend account
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className={smallButton}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming("suspend")}
                className={`${smallButton} text-[var(--danger)]`}
              >
                Suspend…
              </button>
            )}
          </div>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="font-heading text-[16px] font-semibold">
            IP addresses
          </h3>
          {detail.ips.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              None recorded.
            </p>
          ) : (
            <table className="mt-2 w-full text-left text-[13px]">
              <tbody>
                {detail.ips.map((ip) => (
                  <tr
                    key={ip.ip_address}
                    className="border-t border-[var(--border)] first:border-t-0"
                  >
                    <td className="py-1.5 font-mono text-[12px]">
                      {ip.ip_address}
                    </td>
                    <td className="py-1.5 text-[var(--text-muted)]">
                      {ip.events} event(s)
                    </td>
                    <td className="py-1.5 text-right text-[var(--text-muted)]">
                      {formatDateTime(ip.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel className="p-5">
          <h3 className="font-heading text-[16px] font-semibold">
            Credit ledger
          </h3>
          {detail.credit_entries.length === 0 ? (
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              No entries yet (the welcome credits are added at first use).
            </p>
          ) : (
            <table className="mt-2 w-full text-left text-[13px]">
              <tbody>
                {detail.credit_entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-[var(--border)] first:border-t-0"
                  >
                    <td className="py-1.5 font-semibold">
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </td>
                    <td className="py-1.5">{entry.reason}</td>
                    <td className="py-1.5 text-[var(--text-muted)]">
                      {entry.note ?? ""}
                    </td>
                    <td className="py-1.5 text-right text-[var(--text-muted)]">
                      {formatDateTime(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel className="p-5">
        <h3 className="font-heading text-[16px] font-semibold">Artworks</h3>
        {detail.assets_list.length === 0 ? (
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">
            No artworks.
          </p>
        ) : (
          <ul className="mt-2 text-[13px]">
            {detail.assets_list.map((asset) => (
              <li
                key={asset.id}
                className="flex justify-between border-t border-[var(--border)] py-1.5 first:border-t-0"
              >
                <span>
                  #{asset.id} {asset.title}
                  {asset.status !== "active" && ` (${asset.status})`}
                </span>
                <span className="text-[var(--text-muted)]">
                  {formatDateTime(asset.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h3 className="px-5 pt-5 font-heading text-[16px] font-semibold">
          Recent activity
        </h3>
        <EventTable events={detail.events} />
      </Panel>

      <Panel>
        <h3 className="px-5 pt-5 font-heading text-[16px] font-semibold">
          Feedback
        </h3>
        {detail.feedback.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-[var(--text-muted)]">
            None.
          </p>
        ) : (
          <ul className="mt-2">
            {detail.feedback.map((row) => (
              <FeedbackItem key={row.id} row={row} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function UsersTab() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<AdminPage<AdminUserRow> | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected !== null) return;

    const controller = new AbortController();

    api.admin
      .users({ q: applied, offset }, controller.signal)
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
  }, [applied, offset, selected]);

  if (selected !== null) {
    return (
      <UserDetailView userId={selected} onBack={() => setSelected(null)} />
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setApplied(query.trim());
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email"
          aria-label="Search users by email"
          className={`${inputClass} w-full sm:w-80`}
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--primary-strong)] px-4 py-2 text-[14px] font-semibold text-white"
        >
          Search
        </button>
      </form>

      <ErrorLine message={error} />

      <Panel className="overflow-x-auto">
        {!data ? (
          <p className="px-4 py-6 text-[14px]">Loading…</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Plan</th>
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
                    colSpan={6}
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
