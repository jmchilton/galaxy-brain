// Where a record's work lives: its GitHub page and local worktree, read from its index.md.

import { escapeRegExp, FORK_OWNER, githubLinks, upstreamOwner } from "../../site/src/lib/repository-tabs";
import type { RecordRef } from "./launchers";

// Branches are pushed to the fork, except foundry's, which go on the upstream repository.
const BRANCHES_ON_UPSTREAM = new Set(["foundry"]);

/**
 * Branches: their PR (linked, or named on the Status line), else their branch;
 * reviews and issues: the PR or issue named by the record.
 */
export function githubUrl(record: RecordRef, body: string): string {
	const all = githubLinks(body);
	const id = escapeRegExp(record.name);
	const find = (pattern: RegExp, label?: RegExp) =>
		all.find((link) => pattern.test(link.url) && (!label || label.test(link.label)))?.url;
	const upstream = `https://github.com/${upstreamOwner(record.repo, [body])}/${record.repo}`;
	if (record.kind === "reviews") return find(new RegExp(`/pull/${id}$`)) ?? `${upstream}/pull/${record.name}`;
	if (record.kind === "issues") return find(new RegExp(`/issues/${id}$`)) ?? `${upstream}/issues/${record.name}`;
	const statusPr = /^Status:.*?\bPR #(\d+)/m.exec(body)?.[1];
	const forkOwner = BRANCHES_ON_UPSTREAM.has(record.repo) ? upstreamOwner(record.repo, [body]) : FORK_OWNER;
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
