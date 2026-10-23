// Recent upstream activity for the repository view, fetched with `gh api graphql`.

import type { RecordRef } from "./launchers";
import { githubUrl } from "./record-links";

export interface FeedItem {
	number: number;
	title: string;
	url: string;
	author: string;
	/** When the item entered the feed: created, or marked ready for review. */
	at: string;
	isDraft: boolean;
	/** PR head branch name. */
	branch?: string;
}

export interface Feeds {
	newPrs: FeedItem[];
	undraftedPrs: FeedItem[];
	issues: FeedItem[];
	myDrafts: FeedItem[];
	conflicting: FeedItem[];
	/** My PRs GitHub hasn't computed mergeability for yet; querying starts it. */
	unchecked: number;
}

export type FeedList = Exclude<keyof Feeds, "unchecked">;

const FIELDS = "number title url createdAt author { login }";

export const FEED_QUERY = `query($owner: String!, $name: String!, $mine: String!) {
  repository(owner: $owner, name: $name) {
    created: pullRequests(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS} isDraft headRefName }
    }
    updated: pullRequests(states: OPEN, first: 60, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes { ${FIELDS} isDraft headRefName timelineItems(itemTypes: [READY_FOR_REVIEW_EVENT], last: 1) { nodes { ... on ReadyForReviewEvent { createdAt } } } }
    }
    issues(states: OPEN, first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { ${FIELDS} }
    }
  }
  mine: search(query: $mine, type: ISSUE, first: 100) {
    nodes { ... on PullRequest { ${FIELDS} isDraft headRefName mergeable } }
  }
}`;

interface Node {
	number: number;
	title: string;
	url: string;
	createdAt: string;
	author: { login: string } | null;
	isDraft?: boolean;
	headRefName?: string;
	mergeable?: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
	timelineItems?: { nodes: Array<{ createdAt?: string }> };
}

const item = (node: Node, at = node.createdAt): FeedItem => ({
	number: node.number,
	title: node.title,
	url: node.url,
	author: node.author?.login ?? "ghost",
	at,
	isDraft: node.isDraft ?? false,
	...(node.headRefName ? { branch: node.headRefName } : {}),
});

export function feedArgs(owner: string, name: string): string[] {
	const mine = `repo:${owner}/${name} is:pr is:open author:@me sort:updated-desc`;
	return ["api", "graphql", "-f", `owner=${owner}`, "-f", `name=${name}`, "-f", `mine=${mine}`, "-f", `query=${FEED_QUERY}`];
}

export function parseFeeds(json: string): Feeds {
	const data = JSON.parse(json).data;
	const repository = data.repository as Record<"created" | "updated" | "issues", { nodes: Node[] }>;
	const mine = (data.mine as { nodes: Node[] }).nodes;
	const undraftedPrs = repository.updated.nodes
		.filter((node) => !node.isDraft)
		.flatMap((node) => {
			const readyAt = node.timelineItems?.nodes[0]?.createdAt;
			return readyAt ? [item(node, readyAt)] : [];
		})
		.sort((a, b) => b.at.localeCompare(a.at));
	return {
		newPrs: repository.created.nodes.map((node) => item(node)),
		undraftedPrs,
		issues: repository.issues.nodes.map((node) => item(node)),
		myDrafts: mine.filter((node) => node.isDraft).map((node) => item(node)),
		conflicting: mine.filter((node) => node.mergeable === "CONFLICTING").map((node) => item(node)),
		unchecked: mine.filter((node) => node.mergeable === "UNKNOWN").length,
	};
}

/**
 * Records about a feed item: issue records for issues; for PRs, review records under
 * the PR number and branch records for the PR's head branch or linking the PR.
 */
export function matchRecords<R extends RecordRef>(item: FeedItem, isIssue: boolean, records: R[], bodyOf: (record: R) => string): R[] {
	const number = String(item.number);
	return records.filter((record) => {
		if (isIssue) return record.kind === "issues" && record.name === number;
		if (record.kind === "reviews") return record.name === number;
		return record.kind === "branches" && (record.name === item.branch || githubUrl(record, bodyOf(record)) === item.url);
	});
}
