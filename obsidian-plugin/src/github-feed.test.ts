import { describe, expect, it } from "vitest";
import { feedArgs, matchRecords, parseFeeds } from "./github-feed";
import { recordFromPath } from "./launchers";

const pr = (number: number, extra: object = {}) => ({
	number,
	title: `PR ${number}`,
	url: `https://github.com/galaxyproject/galaxy/pull/${number}`,
	createdAt: "2026-10-01T00:00:00Z",
	author: { login: "someone" },
	isDraft: false,
	...extra,
});

const ready = (at: string) => ({ timelineItems: { nodes: [{ createdAt: at }] } });

const RESPONSE = JSON.stringify({
	data: {
		repository: {
			created: { nodes: [pr(3, { isDraft: true, headRefName: "fix_3" }), pr(2, { author: null })] },
			updated: {
				nodes: [
					pr(5, ready("2026-10-20T00:00:00Z")),
					pr(6, { ...ready("2026-10-22T00:00:00Z"), isDraft: true }),
					pr(7, { timelineItems: { nodes: [] } }),
					pr(8, ready("2026-10-21T00:00:00Z")),
				],
			},
			issues: { nodes: [{ ...pr(9), isDraft: undefined }] },
		},
		mine: {
			nodes: [
				pr(10, { isDraft: true, mergeable: "MERGEABLE" }),
				pr(11, { mergeable: "CONFLICTING" }),
				pr(12, { isDraft: true, mergeable: "CONFLICTING" }),
				pr(13, { mergeable: "UNKNOWN" }),
			],
		},
	},
});

describe("parseFeeds", () => {
	const feeds = parseFeeds(RESPONSE);

	it("lists new PRs in order with draft flags and ghost authors", () => {
		expect(feeds.newPrs.map((i) => [i.number, i.isDraft, i.author])).toEqual([
			[3, true, "someone"],
			[2, false, "ghost"],
		]);
	});

	it("keeps PR head branches", () => {
		expect(feeds.newPrs.map((i) => i.branch)).toEqual(["fix_3", undefined]);
	});

	it("lists PRs marked ready that are still ready, newest first, timed by the event", () => {
		expect(feeds.undraftedPrs.map((i) => [i.number, i.at])).toEqual([
			[8, "2026-10-21T00:00:00Z"],
			[5, "2026-10-20T00:00:00Z"],
		]);
	});

	it("lists issues", () => {
		expect(feeds.issues.map((i) => i.number)).toEqual([9]);
	});

	it("lists my drafts and my conflicting PRs, counting PRs GitHub hasn't checked yet", () => {
		expect(feeds.myDrafts.map((i) => i.number)).toEqual([10, 12]);
		expect(feeds.conflicting.map((i) => i.number)).toEqual([11, 12]);
		expect(feeds.unchecked).toBe(1);
	});
});

describe("feedArgs", () => {
	it("passes owner, name and query as gh api graphql fields", () => {
		expect(feedArgs("galaxyproject", "galaxy").slice(0, 6)).toEqual([
			"api", "graphql", "-f", "owner=galaxyproject", "-f", "name=galaxy",
		]);
		expect(feedArgs("galaxyproject", "galaxy")[7]).toBe("mine=repo:galaxyproject/galaxy is:pr is:open author:@me sort:updated-desc");
	});
});

describe("matchRecords", () => {
	const records = [
		"repositories/galaxy/branches/active/fix_3/index.md",
		"repositories/galaxy/branches/active/renamed/index.md",
		"repositories/galaxy/reviews/active/3/index.md",
		"repositories/galaxy/issues/queued/3/index.md",
	].map((path) => recordFromPath(path)!);
	const bodies: Record<string, string> = {
		renamed: "- [PR #4](https://github.com/galaxyproject/galaxy/pull/4)",
	};
	const bodyOf = (record: { name: string }) => bodies[record.name] ?? "";
	const names = (matched: Array<{ kind: string; name: string }>) => matched.map((r) => `${r.kind}/${r.name}`);
	const [three] = parseFeeds(RESPONSE).newPrs;

	it("matches a PR's head branch and review records, not issues", () => {
		expect(names(matchRecords(three!, false, records, bodyOf))).toEqual(["branches/fix_3", "reviews/3"]);
	});

	it("matches a branch record that links the PR", () => {
		const four = { ...three!, number: 4, branch: "other", url: "https://github.com/galaxyproject/galaxy/pull/4" };
		expect(names(matchRecords(four, false, records, bodyOf))).toEqual(["branches/renamed"]);
	});

	it("matches issue records for issues", () => {
		expect(names(matchRecords({ ...three!, branch: undefined }, true, records, bodyOf))).toEqual(["issues/3"]);
	});
});
