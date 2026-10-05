import type { MatchRecord } from "@/lib/api";

/**
 * Which card a match belongs to on the matches page: the same picture
 * found on several pages is one card. A card is one artwork, one review
 * status and one candidate image (its address, else its hash); a match
 * with no image information stands alone. The backend counts cards the
 * same way (count_match_records_by_status).
 */
export function cardKey(match: MatchRecord): string {
  const imageKey = match.candidate_image_url ?? match.candidate_image_hash;

  return imageKey
    ? `${match.asset_id}|${match.review_status}|${imageKey}`
    : `solo|${match.id}`;
}

/** Number of cards the given matches make up. */
export function countCards(matches: MatchRecord[]): number {
  return new Set(matches.map(cardKey)).size;
}
