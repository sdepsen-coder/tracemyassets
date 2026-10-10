import { LEGAL_ADDRESS, LEGAL_NAME, SITE_NAME } from "@/lib/site";

/**
 * "TraceMyAssets is a trading name of ..." -- shown on the Terms, Refund
 * Policy and Privacy pages. Left out until the legal name is configured.
 */
export function OperatorNotice() {
  if (!LEGAL_NAME) return null;

  return (
    <p data-testid="operator-notice">
      {SITE_NAME} is a trading name of {LEGAL_NAME}, sole trader
      {LEGAL_ADDRESS ? `, ${LEGAL_ADDRESS}` : ""}.
    </p>
  );
}
