// CI checks for a branch (its PR and fork branch) or review (its PR), fetched with the gh CLI.

import { FORK_OWNER, upstreamOwner } from "../../site/src/lib/repository-tabs";
import type { RecordRef } from "./launchers";
import { recordFrontmatter } from "./record-frontmatter";

export interface CiCheck {
	name: string;
	workflow?: string;
	url: string;
}

export interface CiSummary {
	failed: CiCheck[];
	running: CiCheck[];
	passed: number;
	skipped: number;
}

export interface CiSource {
	label: string;
	/** gh arguments; output goes to summarizePrChecks for PRs, summarizeCheckRuns otherwise. */
	args: string[];
	url: string;
}

const PR_FIELDS = "name,state,bucket,link,workflow";

export const isPrSource = (source: CiSource) => source.args[0] === "pr";

/** What to check: the PR (`pr:` frontmatter for branches, the record for reviews), then a branch's fork branch. */
export function ciSources(record: RecordRef, body: string): CiSource[] {
	const upstream = `${upstreamOwner(record.repo, [body])}/${record.repo}`;
	const pr = record.kind === "reviews" ? record.name : record.kind === "branches" ? recordFrontmatter(body).pr?.toString() : undefined;
	const sources: CiSource[] = [];
	if (pr) sources.push({ label: `PR #${pr}`, args: ["pr", "checks", pr, "--repo", upstream, "--json", PR_FIELDS], url: `https://github.com/${upstream}/pull/${pr}` });
	if (record.kind === "branches") {
		const fork = `${FORK_OWNER}/${record.repo}`;
		sources.push({
			label: "Fork branch",
			args: ["api", "--paginate", `repos/${fork}/commits/${encodeURIComponent(record.name)}/check-runs?per_page=100`, "--jq", ".check_runs[] | {name, status, conclusion, html_url}"],
			url: `https://github.com/${fork}/tree/${record.name}`,
		});
	}
	return sources;
}

const empty = (): CiSummary => ({ failed: [], running: [], passed: 0, skipped: 0 });

/** `gh pr checks --json` output, bucketed by gh. */
export function summarizePrChecks(json: string): CiSummary {
	const summary = empty();
	const checks = (json.trim() ? JSON.parse(json) : []) as { name: string; bucket: string; link: string; workflow: string }[];
	for (const { name, bucket, link, workflow } of checks) {
		const check = { name, workflow, url: link };
		if (bucket === "fail" || bucket === "cancel") summary.failed.push(check);
		else if (bucket === "pending") summary.running.push(check);
		else if (bucket === "pass") summary.passed++;
		else summary.skipped++;
	}
	return summary;
}

/** JSON lines of check-runs `{name, status, conclusion, html_url}`. */
export function summarizeCheckRuns(lines: string): CiSummary {
	const summary = empty();
	for (const line of lines.split("\n").filter((l) => l.trim())) {
		const { name, status, conclusion, html_url: url } = JSON.parse(line) as { name: string; status: string; conclusion: string | null; html_url: string };
		if (status !== "completed") summary.running.push({ name, url });
		else if (conclusion === "success" || conclusion === "neutral") summary.passed++;
		else if (conclusion === "skipped") summary.skipped++;
		else summary.failed.push({ name, url });
	}
	return summary;
}
