import type { AssetScan } from "@/lib/api";

export type ScanExplanation = {
  headline: string;
  points: string[];
  nextSteps: string[];
};

/**
 * A short, plain-language reading of a finished scan: what it most likely
 * means and what to do next. It only interprets numbers the scan already
 * reported; it never claims more than they support.
 */
export function explainScan(
  scan: Pick<AssetScan, "scan_job" | "diagnostics">,
  kind: "standard" | "deep",
): ScanExplanation {
  const matches = scan.scan_job.match_count;
  const checked = scan.scan_job.candidate_count;
  const d = scan.diagnostics;

  const points: string[] = [];
  const nextSteps: string[] = [];

  let headline: string;

  if (checked === 0) {
    headline =
      "The search sources returned nothing to check this time, so this scan says nothing either way.";
    nextSteps.push("Try again later, or run a deep scan for wider coverage.");
  } else if (matches > 0) {
    headline =
      matches === 1
        ? "One possible copy was found and needs your eyes."
        : `${matches} possible copies were found and need your eyes.`;

    points.push(
      "Each one was compared with your artwork by image content, so look for the same picture, not just a similar subject.",
    );
    points.push(
      "A match on a shop or category page may be one item among many. The card says which kind of page it is.",
    );

    nextSteps.push(
      "Open Review matches and compare each card side by side with your artwork.",
    );
    nextSteps.push(
      "Use Ignore or Archive for ones that are not yours, and Delete to remove them entirely.",
    );
    nextSteps.push(
      "Press a result button (for example Unrelated) on each card. It tells us where the checker is wrong.",
    );
  } else {
    headline =
      "Nothing that looks like your artwork was found among the results checked.";

    points.push(
      "That is encouraging, but it is not proof that no copy exists. Search sources only show part of the web.",
    );
    nextSteps.push("Nothing to do now. Monitoring will check again on schedule.");
  }

  if (d && checked > 0) {
    const unusable =
      (d.no_image_address ?? 0) +
      (d.image_unreachable ?? 0) +
      (d.not_comparable ?? 0);

    if (unusable > 0 && unusable >= checked / 2) {
      points.push(
        `${unusable} of ${checked} results could not be compared (no usable picture), so coverage was limited.`,
      );
    }

    if (d.below_threshold > 0 && d.best_similarity_percent !== null) {
      points.push(
        `The closest result that did not count was ${d.best_similarity_percent.toFixed(0)}% similar. Lowering your similarity threshold would show lookalikes like it.`,
      );
    }

    if ((d.page_unrelated ?? 0) > 0) {
      points.push(
        `${d.page_unrelated} result${d.page_unrelated === 1 ? " was" : "s were"} dropped because the page no longer shows your image.`,
      );
    }
  }

  if (kind === "standard" && matches === 0) {
    nextSteps.push(
      "For a wider search across the web, run a deep scan (uses 1 credit).",
    );
  }

  return { headline, points, nextSteps };
}
