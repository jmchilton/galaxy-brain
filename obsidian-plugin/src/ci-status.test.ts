import { describe, expect, it } from "vitest";
import { recordFromPath } from "./launchers";
import { ciSources, summarizeCheckRuns, summarizePrChecks } from "./ci-status";

const branch = recordFromPath("repositories/galaxy/branches/active/fix_26.0/index.md")!;
const review = recordFromPath("repositories/galaxy/reviews/active/23295/index.md")!;

describe("ciSources", () => {
	it("checks a branch's PR and its fork branch", () => {
		expect(ciSources(branch, "---\npr: 24300\n---\n")).toEqual([
			{ label: "PR #24300", args: ["pr", "checks", "24300", "--repo", "galaxyproject/galaxy", "--json", "name,state,bucket,link,workflow"], url: "https://github.com/galaxyproject/galaxy/pull/24300" },
			{
				label: "Fork branch",
				args: ["api", "--paginate", "repos/jmchilton/galaxy/commits/fix_26.0/check-runs?per_page=100", "--jq", ".check_runs[] | {name, status, conclusion, html_url}"],
				url: "https://github.com/jmchilton/galaxy/tree/fix_26.0",
			},
		]);
	});

	it("checks only the fork branch without a pr, and only the PR for a review", () => {
		expect(ciSources(branch, "# B").map((s) => s.label)).toEqual(["Fork branch"]);
		expect(ciSources(review, "").map((s) => s.label)).toEqual(["PR #23295"]);
	});
});

describe("summarizePrChecks", () => {
	it("lists failed and running checks, counts the rest", () => {
		const json = JSON.stringify([
			{ name: "api", bucket: "fail", state: "FAILURE", link: "https://x/1", workflow: "API tests" },
			{ name: "lint", bucket: "pending", state: "IN_PROGRESS", link: "https://x/2", workflow: "Lint" },
			{ name: "unit", bucket: "pass", state: "SUCCESS", link: "https://x/3", workflow: "Unit" },
			{ name: "unit2", bucket: "pass", state: "SUCCESS", link: "https://x/4", workflow: "Unit" },
			{ name: "rep", bucket: "skipping", state: "SKIPPED", link: "https://x/5", workflow: "Report" },
			{ name: "old", bucket: "cancel", state: "CANCELLED", link: "https://x/6", workflow: "Old" },
		]);
		expect(summarizePrChecks(json)).toEqual({
			failed: [
				{ name: "api", workflow: "API tests", url: "https://x/1" },
				{ name: "old", workflow: "Old", url: "https://x/6" },
			],
			running: [{ name: "lint", workflow: "Lint", url: "https://x/2" }],
			passed: 2,
			skipped: 1,
		});
	});

	it("is empty for no checks", () => {
		expect(summarizePrChecks("[]")).toEqual({ failed: [], running: [], passed: 0, skipped: 0 });
		expect(summarizePrChecks("")).toEqual({ failed: [], running: [], passed: 0, skipped: 0 });
	});
});

describe("summarizeCheckRuns", () => {
	it("reads the jq lines of the check-runs API", () => {
		const lines = [
			{ name: "report", status: "completed", conclusion: "skipped", html_url: "https://y/1" },
			{ name: "startup", status: "completed", conclusion: "success", html_url: "https://y/2" },
			{ name: "selenium", status: "completed", conclusion: "failure", html_url: "https://y/3" },
			{ name: "pw", status: "in_progress", conclusion: null, html_url: "https://y/4" },
			{ name: "queued", status: "queued", conclusion: null, html_url: "https://y/5" },
			{ name: "neutral", status: "completed", conclusion: "neutral", html_url: "https://y/6" },
			{ name: "timeout", status: "completed", conclusion: "timed_out", html_url: "https://y/7" },
		].map((run) => JSON.stringify(run));
		expect(summarizeCheckRuns(lines.join("\n") + "\n")).toEqual({
			failed: [
				{ name: "selenium", url: "https://y/3" },
				{ name: "timeout", url: "https://y/7" },
			],
			running: [
				{ name: "pw", url: "https://y/4" },
				{ name: "queued", url: "https://y/5" },
			],
			passed: 2,
			skipped: 1,
		});
	});
});
