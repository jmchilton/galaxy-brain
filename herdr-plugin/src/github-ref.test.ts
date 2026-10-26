import { describe, expect, it } from "vitest";
import { recordFromPath } from "../../obsidian-plugin/src/launchers";
import { branchRecordsForUrl, parseGithubRef, recordsForRef } from "./github-ref";

const record = (path: string) => recordFromPath(path)!;

describe("parseGithubRef", () => {
	it("reads PRs as reviews and issues as issues, ignoring trailing paths and anchors", () => {
		expect(parseGithubRef("https://github.com/galaxyproject/galaxy/pull/24413")).toEqual({
			owner: "galaxyproject",
			repo: "galaxy",
			kind: "reviews",
			number: 24413,
		});
		expect(parseGithubRef("https://github.com/galaxyproject/pulsar/issues/12#issuecomment-1")).toMatchObject({
			repo: "pulsar",
			kind: "issues",
			number: 12,
		});
		expect(parseGithubRef("https://github.com/jmchilton/galaxy-tool-util-ts/pull/7/files")).toMatchObject({
			repo: "galaxy-tool-util-ts",
			number: 7,
		});
	});

	it("ignores other URLs", () => {
		expect(parseGithubRef("https://github.com/galaxyproject/galaxy/tree/dev")).toBeNull();
		expect(parseGithubRef("https://example.com/galaxyproject/galaxy/pull/1")).toBeNull();
	});
});

describe("recordsForRef", () => {
	const records = [
		record("repositories/galaxy/reviews/active/24413/index.md"),
		record("repositories/galaxy/issues/queued/24350/index.md"),
		record("repositories/galaxy/branches/active/fix_upload/index.md"),
		record("repositories/pulsar/reviews/archived/24413/index.md"),
	];
	const bodies: Record<string, string> = {
		"repositories/galaxy/branches/active/fix_upload": "# Fix upload\n\nStatus: open, PR #24500\n",
	};
	const body = (r: { dir: string }) => bodies[r.dir] ?? "";
	const pr = (repo: string, number: number) => ({ owner: "galaxyproject", repo, kind: "reviews" as const, number });

	it("finds the review record for a PR in the same repo", () => {
		expect(recordsForRef(pr("galaxy", 24413), records, body).map((r) => r.dir)).toEqual([
			"repositories/galaxy/reviews/active/24413",
		]);
	});

	it("finds a branch record whose index.md names the PR", () => {
		expect(recordsForRef(pr("galaxy", 24500), records, body).map((r) => r.dir)).toEqual([
			"repositories/galaxy/branches/active/fix_upload",
		]);
	});

	it("finds the branch record named for the PR's head branch", () => {
		const late = record("repositories/galaxy/branches/active/late_pr/index.md");
		// Compare and tree links come first, so the record's GitHub URL isn't the PR.
		const lateBody = () => "- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:late_pr?expand=1)\n";
		expect(recordsForRef(pr("galaxy", 24452), [late], lateBody, "late_pr").map((r) => r.dir)).toEqual(["repositories/galaxy/branches/active/late_pr"]);
		expect(recordsForRef(pr("galaxy", 24452), [late], lateBody).map((r) => r.kind)).toEqual(["reviews"]);
	});

	it("finds issue records for issues", () => {
		const issue = { owner: "galaxyproject", repo: "galaxy", kind: "issues" as const, number: 24350 };
		expect(recordsForRef(issue, records, body).map((r) => r.dir)).toEqual(["repositories/galaxy/issues/queued/24350"]);
	});

	it("falls back to an untracked record", () => {
		expect(recordsForRef(pr("galaxy", 1), records, body)).toEqual([
			{ repo: "galaxy", kind: "reviews", status: "untracked", name: "1", dir: "" },
		]);
	});
});

describe("branchRecordsForUrl", () => {
	const branches = [
		record("repositories/galaxy/branches/active/ag_grid_36/index.md"),
		record("repositories/galaxy/branches/merged/ag_grid/index.md"),
		record("repositories/galaxy/reviews/active/24413/index.md"),
	];

	it("matches tree, commits and compare URLs by branch name, allowing trailing paths", () => {
		const names = (url: string) => branchRecordsForUrl(url, branches)?.map((r) => r.name);
		expect(names("https://github.com/jmchilton/galaxy/tree/ag_grid_36")).toEqual(["ag_grid_36"]);
		expect(names("https://github.com/jmchilton/galaxy/tree/ag_grid_36/lib/galaxy/x.py")).toEqual(["ag_grid_36"]);
		expect(names("https://github.com/jmchilton/galaxy/commits/ag_grid")).toEqual(["ag_grid"]);
		expect(names("https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:ag_grid_36?expand=1")).toEqual(["ag_grid_36"]);
		expect(names("https://github.com/jmchilton/galaxy/compare/ag_grid_36")).toEqual(["ag_grid_36"]);
	});

	it("is null for non-branch URLs and empty for untracked branches", () => {
		expect(branchRecordsForUrl("https://github.com/galaxyproject/galaxy/pull/24413", branches)).toBeNull();
		expect(branchRecordsForUrl("https://github.com/jmchilton/galaxy/tree/ag_grid_3", branches)).toEqual([]);
		expect(branchRecordsForUrl("https://github.com/jmchilton/pulsar/tree/ag_grid_36", branches)).toEqual([]);
	});
});
