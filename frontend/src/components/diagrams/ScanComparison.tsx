/**
 * The one real observation about Standard vs Deep, worded so it cannot be
 * read as a result or a rate: one test, a third-party artwork, the 3 results
 * not confirmed as copies.
 */
export function ScanComparison({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:p-5 ${className}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        One real test
      </span>
      <p className="mt-2 text-[15px] leading-6 text-[var(--text)]">
        In one test on a widely shared artwork (not ours), a Standard scan found
        nothing and a Deep scan returned 3 results.
      </p>
      <p className="mt-2 text-[13px] leading-5 text-[var(--text-muted)]">
        We have not checked whether those 3 results are copies, and one test
        says nothing about how often either scan finds a copy. The two scans
        use different sources, so each can list pages the other does not.
      </p>
    </div>
  );
}
