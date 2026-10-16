"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  api,
  type AdminAdjustment,
  type AdminPayment,
  type AdminSubscription,
  type AdminUserDetail,
} from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { EventTable } from "./ActivityTab";
import { FeedbackItem } from "./FeedbackTab";
import {
  formatDateTime,
  formatMoney,
  subscriptionLabel,
  subscriptionTone,
} from "./format";
import { Badge, ErrorLine, inputClass, smallButton } from "./ui";

// Plan names the server accepts (see PLAN_LIMITS on the backend).
const PLANS = ["Free", "Pro", "Extra", "Internal"];

const SECTIONS = [
  ["profile", "Profile"],
  ["subscription", "Subscription"],
  ["payments", "Payments"],
  ["credits", "Credits"],
  ["artworks", "Artworks"],
  ["activity", "Activity"],
  ["actions", "Actions"],
] as const;

type SectionId = (typeof SECTIONS)[number][0];

function Section({
  id,
  title,
  aside,
  children,
  flush = false,
}: {
  id: SectionId;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  /** Content brings its own padding (tables that run edge to edge). */
  flush?: boolean;
}) {
  return (
    <Panel className={flush ? "" : "p-5"}>
      <section id={`user-${id}`} aria-labelledby={`user-${id}-title`}>
        <div
          className={[
            "flex flex-wrap items-baseline justify-between gap-2",
            flush ? "px-5 pt-5" : "",
          ].join(" ")}
        >
          <h3
            id={`user-${id}-title`}
            className="font-heading text-[16px] font-semibold"
          >
            {title}
          </h3>
          {aside && (
            <div className="text-[12px] text-[var(--text-muted)]">{aside}</div>
          )}
        </div>
        {children}
      </section>
    </Panel>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 text-[13px] text-[var(--text-muted)]">{children}</p>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12px]">{children}</span>;
}

function intervalLabel(interval: string | null): string {
  if (interval === "month") return "monthly";
  if (interval === "year") return "yearly";

  return interval ?? "";
}

function SubscriptionCard({ item }: { item: AdminSubscription }) {
  const cancelling = item.scheduled_action === "cancel";

  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] p-4 first-of-type:mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          {item.plan ?? "Unknown plan"}
          {item.interval && (
            <span className="font-normal text-[var(--text-muted)]">
              {" "}
              · {intervalLabel(item.interval)}
            </span>
          )}
        </span>
        <Badge className={subscriptionTone(item.status, cancelling)}>
          {cancelling ? "Cancels at period end" : subscriptionLabel(item.status)}
        </Badge>
        {!item.has_access && item.status !== "canceled" && (
          <Badge>No access</Badge>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
        <Field label="Started">{formatDateTime(item.started_at)}</Field>
        <Field
          label={
            cancelling
              ? "Ends"
              : item.status === "canceled"
                ? "Period ended"
                : "Renews"
          }
        >
          {formatDateTime(
            cancelling ? item.scheduled_at : item.current_period_end,
          )}
        </Field>
        {item.scheduled_action && !cancelling && (
          <Field label="Scheduled change">
            {item.scheduled_action} · {formatDateTime(item.scheduled_at)}
          </Field>
        )}
        <Field label="Last update">{formatDateTime(item.updated_at)}</Field>
        <Field label="Paddle subscription">
          <Mono>{item.subscription_id}</Mono>
        </Field>
        <Field label="Paddle customer">
          <Mono>{item.customer_id}</Mono>
        </Field>
      </dl>
    </div>
  );
}

function paymentWhat(payment: AdminPayment): string {
  if (payment.kind === "pack") {
    return `${payment.credits ?? "?"} credit pack`;
  }

  if (payment.kind === "plan") {
    const plan = payment.plan ?? "Plan";
    const interval = intervalLabel(payment.interval);
    const renewal = payment.origin === "subscription_recurring";

    return [plan, interval, renewal ? "renewal" : ""]
      .filter(Boolean)
      .join(" · ");
  }

  return "Other payment";
}

function adjustmentLabel(item: AdminAdjustment): string {
  const action = item.action.replace(/_/g, " ");
  const kind = item.type === "partial" ? "partial " : "";

  return `${kind}${action}`;
}

function adjustmentTone(item: AdminAdjustment): string {
  if (item.status !== "approved") {
    return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }

  return item.action.startsWith("chargeback")
    ? "bg-[var(--danger-soft)] text-[var(--danger)]"
    : "bg-[var(--warning-soft)] text-[var(--warning)]";
}

function AdjustmentLine({ item }: { item: AdminAdjustment }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px]">
      <Badge className={adjustmentTone(item)}>{adjustmentLabel(item)}</Badge>
      <span>{formatMoney(item.total, item.currency_code)}</span>
      <span className="text-[var(--text-muted)]">
        {item.status.replace(/_/g, " ")} · {formatDateTime(item.created_at)}
      </span>
      {item.reason && (
        <span className="text-[var(--text-muted)]">“{item.reason}”</span>
      )}
    </div>
  );
}

function PaymentsTable({ payments }: { payments: AdminPayment[] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          <tr>
            <th className="px-5 py-2 font-semibold">Date</th>
            <th className="px-2 py-2 font-semibold">What</th>
            <th className="px-2 py-2 text-right font-semibold">Paid</th>
            <th className="px-2 py-2 text-right font-semibold">Tax</th>
            <th className="px-5 py-2 font-semibold">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr
              key={payment.transaction_id}
              className="border-t border-[var(--border)] align-top"
            >
              <td className="whitespace-nowrap px-5 py-2">
                {formatDateTime(payment.billed_at)}
              </td>
              <td className="px-2 py-2">
                <div>{paymentWhat(payment)}</div>
                {payment.adjustments.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {payment.adjustments.map((item) => (
                      <AdjustmentLine key={item.adjustment_id} item={item} />
                    ))}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right font-semibold">
                <span
                  className={
                    payment.refunded >= payment.total && payment.total > 0
                      ? "text-[var(--text-muted)] line-through"
                      : ""
                  }
                >
                  {formatMoney(payment.total, payment.currency_code)}
                </span>
                {payment.refunded > 0 && (
                  <div className="text-[12px] font-normal text-[var(--warning)]">
                    −{formatMoney(payment.refunded, payment.currency_code)}{" "}
                    back
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right text-[var(--text-muted)]">
                {formatMoney(payment.tax, payment.currency_code)}
              </td>
              <td className="px-5 py-2">
                <Mono>{payment.transaction_id}</Mono>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserDetailView({
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
  const current = detail.subscriptions[0];
  const paidSummary = detail.paid_totals
    .map(
      (row) =>
        `${formatMoney(row.total, row.currency_code)} in ${row.payments} payment(s)` +
        (row.refunded > 0
          ? `, ${formatMoney(row.refunded, row.currency_code)} back`
          : ""),
    )
    .join(" · ");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={smallButton}>
          ← All users
        </button>
        <nav
          aria-label="Sections of this account"
          className="flex flex-wrap gap-1 text-[13px]"
        >
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#user-${id}`}
              className="rounded-lg px-2.5 py-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Section id="profile" title="Profile">
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
          <Field label="Account">#{user.id}</Field>
          <Field label="Joined">{formatDateTime(user.created_at)}</Field>
          <Field label="Last sign-in">{formatDateTime(user.last_sign_in)}</Field>
          <Field label="Paid in total">{paidSummary || "Nothing yet"}</Field>
        </dl>

        {user.suspended && detail.suspension_reason && (
          <p className="mt-3 text-[13px] text-[var(--danger)]">
            Reason: {detail.suspension_reason}
          </p>
        )}
      </Section>

      <ErrorLine message={error} />
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[13px] text-[var(--success)]"
        >
          {notice}
        </p>
      )}

      <Section
        id="subscription"
        title="Subscription"
        aside={
          current && user.plan_type === "Internal"
            ? "Internal accounts keep their plan whatever Paddle says."
            : undefined
        }
      >
        {detail.subscriptions.length === 0 ? (
          <Empty>
            No Paddle subscription. Plan: {user.plan_type}
            {user.plan_type !== "Free" && " (set by hand)"}.
          </Empty>
        ) : (
          detail.subscriptions.map((item) => (
            <SubscriptionCard key={item.subscription_id} item={item} />
          ))
        )}
      </Section>

      <Section
        id="payments"
        title="Payments"
        aside="Amounts as Paddle charged them, tax included."
        flush
      >
        {detail.payments.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-[13px] text-[var(--text-muted)]">
            No payments recorded.
          </p>
        ) : (
          <PaymentsTable payments={detail.payments} />
        )}
        {detail.other_adjustments.length > 0 && (
          <div className="space-y-1 border-t border-[var(--border)] px-5 py-3">
            <p className="text-[12px] text-[var(--text-muted)]">
              Refunds on payments made before payments were recorded:
            </p>
            {detail.other_adjustments.map((item) => (
              <div key={item.adjustment_id}>
                <AdjustmentLine item={item} />{" "}
                <Mono>{item.transaction_id}</Mono>
              </div>
            ))}
          </div>
        )}
        <div className="h-3" />
      </Section>

      <Section
        id="credits"
        title="Credits"
        aside={`Balance: ${user.credits}`}
      >
        {detail.credit_entries.length === 0 ? (
          <Empty>
            No entries yet (the welcome credits are added at first use).
          </Empty>
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
      </Section>

      <Section id="artworks" title="Artworks" aside={`${user.assets} in total`}>
        {detail.assets_list.length === 0 ? (
          <Empty>No artworks.</Empty>
        ) : (
          <ul className="mt-2 text-[13px]">
            {detail.assets_list.map((asset) => (
              <li
                key={asset.id}
                className="flex justify-between gap-3 border-t border-[var(--border)] py-1.5 first:border-t-0"
              >
                <span>
                  #{asset.id} {asset.title}
                  {asset.status !== "active" && ` (${asset.status})`}
                </span>
                <span className="whitespace-nowrap text-[var(--text-muted)]">
                  {formatDateTime(asset.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="activity" title="Activity" flush>
        <div className="grid gap-5 px-5 pt-3 lg:grid-cols-2">
          <div>
            <h4 className="text-[13px] font-semibold">IP addresses</h4>
            {detail.ips.length === 0 ? (
              <Empty>None recorded.</Empty>
            ) : (
              <table className="mt-1 w-full text-left text-[13px]">
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
          </div>

          <div>
            <h4 className="text-[13px] font-semibold">Feedback</h4>
            {detail.feedback.length === 0 && <Empty>None.</Empty>}
          </div>
        </div>

        {detail.feedback.length > 0 && (
          <ul className="mt-2">
            {detail.feedback.map((row) => (
              <FeedbackItem key={row.id} row={row} />
            ))}
          </ul>
        )}

        <h4 className="px-5 pt-4 text-[13px] font-semibold">Recent events</h4>
        <EventTable events={detail.events} />
      </Section>

      <Section id="actions" title="Actions">
        <div className="mt-3 space-y-4">
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
            {current && (
              <span className="pb-2 text-[12px] text-[var(--text-muted)]">
                The next Paddle update sets the plan from the subscription
                again (except Internal).
              </span>
            )}
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
        </div>
      </Section>
    </div>
  );
}
