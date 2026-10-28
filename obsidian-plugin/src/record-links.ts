// Where a record's work lives: its GitHub page and local worktree, read from its index.md.

import { escapeRegExp, FORK_OWNER, githubLinks, upstreamOwner } from "../../site/src/lib/repository-tabs";
import type { RecordRef } from "./launchers";
import { recordFrontmatter } from "./record-frontmatter";

/**
 * Branches: their PR (`pr:` frontmatter, linked, or named on the Status line), else their fork branch;
 * reviews and issues: the PR or issue named by the record; issue drafts: none.
 */
export function githubUrl(record: RecordRef, body: string): string | undefined {
	const all = githubLinks(body);
	const id = escapeRegExp(record.name);
	const find = (pattern: RegExp, label?: RegExp) =>
		all.find((link) => pattern.test(link.url) && (!label || label.test(link.label)))?.url;
	const upstream = `https://github.com/${upstreamOwner(record.repo, [body])}/${record.repo}`;
	if (record.kind === "reviews") return find(new RegExp(`/pull/${id}$`)) ?? `${upstream}/pull/${record.name}`;
	if (record.kind === "issues") return find(new RegExp(`/issues/${id}$`)) ?? `${upstream}/issues/${record.name}`;
	if (record.kind === "issues_incubator") return undefined;
	const statusPr = /^Status:.*?\bPR #(\d+)/m.exec(body)?.[1];
	const pr = recordFrontmatter(body).pr;
	return (
		(pr ? `${upstream}/pull/${pr}` : undefined) ??
		find(/\/pull\/\d+$/, /^(View )?PR #\d+$/) ??
		(statusPr ? `${upstream}/pull/${statusPr}` : undefined) ??
		find(new RegExp(`/tree/${id}$`)) ??
		`https://github.com/${FORK_OWNER}/${record.repo}/tree/${record.name}`
	);
}

/** A branch's GitHub compare against its `upstream_base_branch` frontmatter; undefined without one. */
export function compareUrl(record: RecordRef, body: string): string | undefined {
	if (record.kind !== "branches") return undefined;
	const base = recordFrontmatter(body).upstream_base_branch;
	if (!base) return undefined;
	const upstream = upstreamOwner(record.repo, [body]);
	return `https://github.com/${upstream}/${record.repo}/compare/${base}...${FORK_OWNER}:${record.repo}:${record.name}`;
}

/** Candidate worktrees, best first: a branch's `Worktree:` line, then the conventional location. Issues have none. */
export function worktreeCandidates(record: RecordRef, body: string, home: string): string[] {
	const root = `${home}/projects/worktrees/${record.repo}`;
	if (record.kind === "reviews") return [`${root}/pr/${record.name}`];
	if (record.kind !== "branches") return [];
	const listed = /Worktree:\**\s*`([^`]+)`/.exec(body)?.[1]?.replace(/^~(?=\/)/, home);
	return [...(listed ? [listed] : []), `${root}/branch/${record.name}`];
}
