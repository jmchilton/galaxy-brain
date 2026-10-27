// John's differential-review status line, written to the record for agents and PR text.
import type { ReviewView } from "../../differential-review-lib/src/core";

export const DIFFERENTIAL_REVIEW_URL = "https://galaxy-brain.jmchilton.net/factory/differential-review/";
export const HUMAN_REVIEW_FILE = "human_review.md";

/** The status sentence when every commit and/or every hunk of the latest snapshot is reviewed; null otherwise. */
export function humanReviewStatus(view: Pick<ReviewView, "counts" | "snapshot">): string | null {
	const all = (counts: Record<string, number>) => counts.reviewed! > 0 && counts.new === 0 && counts.changed === 0;
	const commits = all(view.counts.commits);
	const diffs = all(view.counts.hunks);
	const what = commits && diffs ? "commits and diffs" : commits ? "commits" : diffs ? "diffs" : null;
	if (!what) return null;
	return `John (the human) has reviewed all ${what} using [John's Galaxy Brain Differential Review](${DIFFERENTIAL_REVIEW_URL}) at sha1 ${view.snapshot.head}.\n`;
}
