// Repository landing tabs and their GitHub lists. Dependency-free: shared with
// the Obsidian plugin's repository view, which fetches the GitHub tabs itself.

import type { RecordKind } from './records';

export const REPOSITORY_TABS = [
  { id: 'branches', label: 'My branches' },
  { id: 'issues', label: 'My issues' },
  { id: 'issues_incubator', label: 'Issue incubator' },
  { id: 'reviews', label: 'My reviews' },
  { id: 'my-drafts', label: 'My drafts' },
  { id: 'conflicting', label: 'Conflicting' },
  { id: 'new-prs', label: 'New PRs' },
  { id: 'undrafted-prs', label: 'Out of draft' },
  { id: 'new-issues', label: 'New issues' },
] as const;
export type RepositoryTab = typeof REPOSITORY_TABS[number]['id'];
export type GithubTab = Exclude<RepositoryTab, RecordKind>;

// Branches are pushed to John's fork; "my" PRs are his.
export const FORK_OWNER = 'jmchilton';

const GITHUB_LISTS: Record<GithubTab, { list: 'pulls' | 'issues'; query: (me: string) => string; title: string }> = {
  'my-drafts': { list: 'pulls', query: me => `is:pr is:open author:${me} draft:true`, title: 'My open draft PRs on GitHub' },
  // GitHub has no conflict filter.
  conflicting: { list: 'pulls', query: me => `is:pr is:open author:${me}`, title: "My open PRs on GitHub (it can't filter by conflicts)" },
  'new-prs': { list: 'pulls', query: () => 'is:pr is:open sort:created-desc', title: 'Open PRs, newest first, on GitHub' },
  // GitHub can't sort by ready-for-review time; recently updated non-drafts is the closest.
  'undrafted-prs': { list: 'pulls', query: () => 'is:pr is:open draft:false sort:updated-desc', title: 'Open non-draft PRs, recently updated, on GitHub' },
  'new-issues': { list: 'issues', query: () => 'is:issue is:open sort:created-desc', title: 'Open issues, newest first, on GitHub' },
};

/** The tab's list on GitHub; `me` is the author of "my" PRs, `@me` being whoever views it. */
export function githubListUrl(owner: string, repo: string, tab: GithubTab, me = '@me'): string {
  const { list, query } = GITHUB_LISTS[tab];
  return `https://github.com/${owner}/${repo}/${list}?q=${encodeURIComponent(query(me))}`;
}

export function githubListTitle(tab: GithubTab): string {
  return GITHUB_LISTS[tab].title;
}

const MARKDOWN_LINK = /\[([^\]]*)\]\((https:\/\/github\.com\/[^)\s]+)\)/g;

/** GitHub links in a markdown body. */
export function githubLinks(body: string): Array<{ label: string; url: string }> {
  return [...body.matchAll(MARKDOWN_LINK)].map(match => ({ label: match[1]!, url: match[2]! }));
}

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Owner most linked for the repo's PRs and issues, preferring anyone but the fork owner. */
export function upstreamOwner(repo: string, bodies: string[]): string {
  const pattern = new RegExp(`^https://github\\.com/([^/]+)/${escapeRegExp(repo)}/(pull|issues)/`);
  const counts = new Map<string, number>();
  for (const link of bodies.flatMap(githubLinks)) {
    const owner = pattern.exec(link.url)?.[1];
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([owner]) => owner);
  return ranked.find(owner => owner !== FORK_OWNER) ?? ranked[0] ?? 'galaxyproject';
}
