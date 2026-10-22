// Where a record's work lives: its GitHub page and local worktree, read from its index.md.

import type { RecordRef } from "./launchers";

const MARKDOWN_LINK = /\[([^\]]*)\]\((https:\/\/github\.com\/[^)\s]+)\)/g;

function links(body: string): Array<{ label: string; url: string }> {
	return [...body.matchAll(MARKDOWN_LINK)].map((match) => ({ label: match[1]!, url: match[2]! }));
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Branches are pushed to John's fork, except foundry's, which go on the upstream repository.
const FORK_OWNER = "jmchilton";
const BRANCHES_ON_UPSTREAM = new Set(["foundry"]);

function upstreamOwner(record: RecordRef, body: string): string {
	const repo = escape(record.repo);
	const owners = links(body)
		.map((link) => new RegExp(`^https://github\\.com/([^/]+)/${repo}/(pull|issues)/`).exec(link.url)?.[1])
		.filter((owner) => owner && owner !== FORK_OWNER);
	return owners[0] ?? "galaxyproject";
}

/**
 * Branches: their PR (linked, or named on the Status line), else their branch;
 * reviews and issues: the PR or issue named by the record.
 */
export function githubUrl(record: RecordRef, body: string): string {
	const all = links(body);
	const id = escape(record.name);
	const find = (pattern: RegExp, label?: RegExp) =>
		all.find((link) => pattern.test(link.url) && (!label || label.test(link.label)))?.url;
	const upstream = `https://github.com/${upstreamOwner(record, body)}/${record.repo}`;
	if (record.kind === "reviews") return find(new RegExp(`/pull/${id}$`)) ?? `${upstream}/pull/${record.name}`;
	if (record.kind === "issues") return find(new RegExp(`/issues/${id}$`)) ?? `${upstream}/issues/${record.name}`;
	const statusPr = /^Status:.*?\bPR #(\d+)/m.exec(body)?.[1];
	const forkOwner = BRANCHES_ON_UPSTREAM.has(record.repo) ? upstreamOwner(record, body) : FORK_OWNER;
	return (
		find(/\/pull\/\d+$/, /^(View )?PR #\d+$/) ??
		(statusPr ? `${upstream}/pull/${statusPr}` : undefined) ??
		find(new RegExp(`/tree/${id}$`)) ??
		`https://github.com/${forkOwner}/${record.repo}/tree/${record.name}`
	);
}

/** Candidate worktrees, best first: a branch's `Worktree:` line, then the conventional location. Issues have none. */
export function worktreeCandidates(record: RecordRef, body: string, home: string): string[] {
	const root = `${home}/projects/worktrees/${record.repo}`;
	if (record.kind === "reviews") return [`${root}/pr/${record.name}`];
	if (record.kind !== "branches") return [];
	const listed = /Worktree:\**\s*`([^`]+)`/.exec(body)?.[1]?.replace(/^~(?=\/)/, home);
	return [...(listed ? [listed] : []), `${root}/branch/${record.name}`];
}
