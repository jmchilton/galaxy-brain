import { describe, expect, it } from "vitest";
import { humanReviewStatus } from "./diff-review-status";

const counts = (reviewed: number, open = 0) => ({ reviewed, new: open, changed: 0 });
const view = (commits: ReturnType<typeof counts>, hunks: ReturnType<typeof counts>) =>
	({ counts: { commits, hunks, files: counts(0) }, snapshot: { head: "abc123" } }) as Parameters<typeof humanReviewStatus>[0];

describe("humanReviewStatus", () => {
	it.each([
		[counts(2), counts(5), "commits and diffs"],
		[counts(2), counts(4, 1), "commits"],
		[counts(1, 1), counts(5), "diffs"],
	])("names what is fully reviewed", (commits, hunks, what) => {
		expect(humanReviewStatus(view(commits, hunks))).toBe(
			`John (the human) has reviewed all ${what} using [John's Galaxy Brain Differential Review](https://galaxy-brain.jmchilton.net/factory/differential-review/) at sha1 abc123.\n`,
		);
	});

	it("is null when neither is complete or nothing exists", () => {
		expect(humanReviewStatus(view(counts(1, 1), counts(0, 3)))).toBeNull();
		expect(humanReviewStatus(view(counts(0), counts(0)))).toBeNull();
	});
});
