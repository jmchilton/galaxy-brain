// GitHub PR and issue URLs to the vault records tracking them.

import { type RecordRef, untrackedRecord } from "../../obsidian-plugin/src/launchers";
import { githubUrl } from "../../obsidian-plugin/src/record-links";

export interface GithubRef {
	owner: string;
	repo: string;
	/** Record kind for the URL: PRs are reviewed, issues are issues. */
	kind: "reviews" | "issues";
	number: number;
}

export const GITHUB_REF = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)(?:[/?#].*)?$/;

export function parseGithubRef(url: string): GithubRef | null {
	const match = GITHUB_REF.exec(url.trim());
	if (!match) return null;
	const [, owner, repo, type, number] = match;
	return { owner: owner!, repo: repo!, kind: type === "pull" ? "reviews" : "issues", number: Number(number) };
}

/** Records for the PR or issue: by number, plus branches whose PR it is (or named for its head branch); else an untracked stand-in. */
export function recordsForRef(ref: GithubRef, records: RecordRef[], body: (record: RecordRef) => string, headBranch?: string): RecordRef[] {
	const name = String(ref.number);
	const found = records.filter((record) => {
		if (record.repo !== ref.repo) return false;
		if (record.kind === ref.kind) return record.name === name;
		return ref.kind === "reviews" && record.kind === "branches" && (record.name === headBranch || githubUrl(record, body(record)).endsWith(`/pull/${name}`));
	});
	return found.length ? found : [untrackedRecord(ref.repo, ref.kind, ref.number)];
}

const BRANCH_URL = /^https:\/\/github\.com\/[^/]+\/([^/]+)\/(tree|commits|compare)\/([^?#]+)/;

/** The repo and branch-plus-path of a tree, commits or compare URL; compare keeps its head branch. */
export function parseBranchUrl(url: string): { repo: string; path: string } | null {
	const match = BRANCH_URL.exec(url.trim());
	if (!match) return null;
	const [, repo, type, rest] = match;
	let path = decodeURIComponent(rest!);
	if (type === "compare") path = (path.split(/\.{2,3}/).pop() ?? path).split(":").pop()!;
	return { repo: repo!, path };
}

/** Branch records the URL is on, longest name first; null when it isn't a branch URL. */
export function branchRecordsForUrl(url: string, records: RecordRef[]): RecordRef[] | null {
	const ref = parseBranchUrl(url);
	if (!ref) return null;
	return records
		.filter((r) => r.kind === "branches" && r.repo === ref.repo && (ref.path === r.name || ref.path.startsWith(`${r.name}/`)))
		.sort((a, b) => b.name.length - a.name.length);
}
