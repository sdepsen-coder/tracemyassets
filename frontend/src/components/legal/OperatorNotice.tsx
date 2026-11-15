import {
  HAS_LEGAL_NAME,
  LEGAL_ADDRESS,
  LEGAL_NAME,
  SITE_NAME,
} from "@/lib/site";

/**
 * "TraceMyAssets is a trading name of <legal name>, sole trader, <address>"
 * -- shown on the Terms, Refund Policy, Privacy and About pages.
 *
 * NEXT_PUBLIC_LEGAL_NAME must be the owner's own name (UK law for a sole
 * trader using a trading name). While it is unset, or set to the trading name
 * itself, the sentence says only what is true without it instead of the
 * circular "a trading name of TraceMyAssets".
 */
export function OperatorNotice() {
  if (!HAS_LEGAL_NAME && !LEGAL_ADDRESS) return null;

  return (
    <p data-testid="operator-notice">
      {HAS_LEGAL_NAME
        ? `${SITE_NAME} is a trading name of ${LEGAL_NAME}, sole trader`
        : `${SITE_NAME} is run by a sole trader`}
      {LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}.
    </p>
  );
}
