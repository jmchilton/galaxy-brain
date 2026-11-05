import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RECORD_KINDS, groupBySections, groupingFor, parseGrouping } from './records';
import { FORK_OWNER, REPOSITORY_TABS, githubListTitle, githubListUrl, repositoryTabs, searchTabs, upstreamOwner } from './repository-tabs';

const QUEUE_PATH = 'repositories/galaxy/branches/MY_BRANCHES.md';

const QUEUE = `# Open PR and branch queue

Snapshot: 2026-10-22 ([\`fix_a\`](active/fix_a/index.md) mentioned).

## Open Galaxy PRs — ready from our side (\`ready\`)

- [\`fix_b\`](active/fix_b/index.md) — B. [#2](https://github.com/galaxyproject/galaxy/pull/2).
- [\`moved\`](active/moved/index.md) — now merged.

## Draft Galaxy PRs — waiting for CI (\`ci_wait\`)

None yet.

## Galaxy branches — reference only (\`branches_reference\`)
- [\`fix_a\`](active/fix_a/index.md) — A.
- [\`elsewhere\`](../../pulsar/branches/active/elsewhere/index.md) — other repo.
`;

describe('parseGrouping', () => {
  it('reads sections in order with the record names they link', () => {
    expect(parseGrouping(QUEUE, QUEUE_PATH, 'galaxy', 'branches')).toEqual([
      { key: 'ready', label: 'Open Galaxy PRs — ready from our side', names: ['fix_b', 'moved'] },
      { key: 'ci_wait', label: 'Draft Galaxy PRs — waiting for CI', names: [] },
      { key: 'branches_reference', label: 'Galaxy branches — reference only', names: ['fix_a'] },
    ]);
  });

  it("parses the vault's MY_BRANCHES.md", () => {
    const text = readFileSync(new URL(`../../../vault/${QUEUE_PATH}`, import.meta.url), 'utf8');
    const sections = parseGrouping(text, QUEUE_PATH, 'galaxy', 'branches');
    expect(sections.map(section => section.key)).toContain('branches_need_polish');
    expect(sections.reduce((n, section) => n + section.names.length, 0)).toBeGreaterThan(0);
  });

  it('finds the record link after a GitHub link', () => {
    const text = '## Queued to research (`queued_research`)\n\n- [#12](https://github.com/galaxyproject/foundry/issues/12) — x; next: y. [notes](queued/12/index.md)\n';
    expect(parseGrouping(text, 'repositories/foundry/issues/MY_ISSUES.md', 'foundry', 'issues')).toEqual([
      { key: 'queued_research', label: 'Queued to research', names: ['12'] },
    ]);
  });

  it("parses the vault's Foundry MY_ISSUES.md", () => {
    const path = groupingFor('foundry', 'issues')!;
    const sections = parseGrouping(readFileSync(new URL(`../../../vault/${path}`, import.meta.url), 'utf8'), path, 'foundry', 'issues');
    expect(sections.find(section => section.key === 'queued_research')!.names.length).toBeGreaterThan(0);
  });

  it("parses the vault's MY_ISSUES.md and MY_REVIEWS.md", () => {
    for (const [kind, key] of [['issues', 'needs_decision'], ['reviews', 'to_review']] as const) {
      const path = groupingFor('galaxy', kind)!;
      const sections = parseGrouping(readFileSync(new URL(`../../../vault/${path}`, import.meta.url), 'utf8'), path, 'galaxy', kind);
      expect(sections.map(section => section.key)).toContain(key);
      expect(sections.reduce((n, section) => n + section.names.length, 0)).toBeGreaterThan(0);
      expect(sections.flatMap(section => section.names)).not.toContain('');
    }
  });
});

describe('groupBySections', () => {
  const records = ['fix_a', 'fix_b', 'fix_c', 'moved', 'old'].map(name => ({ kind: 'branches' as const, status: 'active', name }));

  it('fills non-empty sections in order, each record once, and returns the rest', () => {
    const { sections, rest } = groupBySections(records, 'branches', parseGrouping(QUEUE, QUEUE_PATH, 'galaxy', 'branches'));
    expect(sections.map(s => [s.key, s.records.map(r => r.name)])).toEqual([
      ['ready', ['fix_b', 'moved']],
      ['branches_reference', ['fix_a']],
    ]);
    expect(rest.map(r => r.name)).toEqual(['fix_c', 'old']);
  });

  it('returns every record of the kind as the rest without a grouping', () => {
    expect(groupBySections(records, 'branches', undefined)).toEqual({ sections: [], rest: records });
    expect(groupBySections(records, 'issues', undefined).rest).toEqual([]);
  });
});

describe('groupingFor', () => {
  it("names each repository's branch, issue and review queue and nothing for incubating issues", () => {
    expect(groupingFor('galaxy', 'branches')).toBe(QUEUE_PATH);
    expect(groupingFor('pulsar', 'branches')).toBe('repositories/pulsar/branches/MY_BRANCHES.md');
    expect(groupingFor('galaxy', 'issues')).toBe('repositories/galaxy/issues/MY_ISSUES.md');
    expect(groupingFor('planemo', 'reviews')).toBe('repositories/planemo/reviews/MY_REVIEWS.md');
    expect(groupingFor('galaxy', 'issues_incubator')).toBeUndefined();
  });
});

describe('upstreamOwner', () => {
  it('picks the most linked non-fork owner across records', () => {
    const bodies = [
      '[a](https://github.com/jmchilton/galaxy/pull/1) [b](https://github.com/jmchilton/galaxy/pull/2)',
      '[c](https://github.com/galaxyproject/galaxy/issues/3) [d](https://github.com/jmchilton/galaxy/tree/x)',
    ];
    expect(upstreamOwner('galaxy', bodies)).toBe('galaxyproject');
  });

  it('uses the fork owner when it is the only one, else defaults to galaxyproject', () => {
    expect(upstreamOwner('galaxy-tool-util-ts', ['[a](https://github.com/jmchilton/galaxy-tool-util-ts/pull/4)'])).toBe('jmchilton');
    expect(upstreamOwner('galaxy', [])).toBe('galaxyproject');
  });
});

describe('REPOSITORY_TABS', () => {
  it('lists record tabs first, then GitHub tabs', () => {
    expect(REPOSITORY_TABS.map(tab => tab.id)).toEqual([
      'branches', 'issues', 'issues_incubator', 'reviews', 'my-drafts', 'conflicting', 'new-prs', 'undrafted-prs', 'new-issues',
    ]);
  });
});

describe('record tabs', () => {
  it('gives every record kind a tab', () => {
    const ids: readonly string[] = REPOSITORY_TABS.map(tab => tab.id);
    expect(RECORD_KINDS.filter(kind => !ids.includes(kind))).toEqual([]);
  });
});

describe('githubListUrl', () => {
  const base = 'https://github.com/galaxyproject/galaxy';
  const url = (list: string, query: string) => `${base}/${list}?q=${encodeURIComponent(query)}`;

  it("links each GitHub tab to its list filter, with the viewer's own PRs by default", () => {
    expect(githubListUrl('galaxyproject', 'galaxy', 'new-prs')).toBe(url('pulls', 'is:pr is:open sort:created-desc'));
    expect(githubListUrl('galaxyproject', 'galaxy', 'undrafted-prs')).toBe(url('pulls', 'is:pr is:open draft:false sort:updated-desc'));
    expect(githubListUrl('galaxyproject', 'galaxy', 'new-issues')).toBe(url('issues', 'is:issue is:open sort:created-desc'));
    expect(githubListUrl('galaxyproject', 'galaxy', 'my-drafts')).toBe(url('pulls', 'is:pr is:open author:@me draft:true'));
    expect(githubListUrl('galaxyproject', 'galaxy', 'conflicting')).toBe(url('pulls', 'is:pr is:open author:@me'));
  });

  it('names a fixed author for public pages', () => {
    expect(githubListUrl('galaxyproject', 'galaxy', 'my-drafts', FORK_OWNER)).toBe(url('pulls', 'is:pr is:open author:jmchilton draft:true'));
  });

  it("links a repository's search tabs to their issue searches", () => {
    const foundry = (query: string) => `https://github.com/galaxyproject/foundry/issues?q=${encodeURIComponent(query)}`;
    expect(githubListUrl('galaxyproject', 'foundry', 'needs-triage')).toBe(foundry('is:issue is:open label:needs-triage sort:created-desc'));
    expect(githubListUrl('galaxyproject', 'foundry', 'ready-implement')).toBe(foundry('is:issue is:open label:work/ready-implement sort:created-desc'));
    expect(githubListUrl('galaxyproject', 'foundry', 'ready-research')).toBe(foundry('is:issue is:open label:work/ready-research sort:created-desc'));
    expect(githubListTitle('foundry', 'needs-triage')).toBe('Open issues labelled needs-triage, newest first, on GitHub');
    expect(() => githubListUrl('galaxyproject', 'galaxy', 'needs-triage')).toThrow('no GitHub tab needs-triage for galaxy');
  });
});

describe('repositoryTabs', () => {
  it("appends a repository's search tabs to the shared tabs", () => {
    expect(repositoryTabs('foundry').map(tab => tab.id)).toEqual([...REPOSITORY_TABS.map(tab => tab.id), 'needs-triage', 'ready-implement', 'ready-research']);
    expect(repositoryTabs('galaxy')).toEqual([...REPOSITORY_TABS]);
    expect(searchTabs('galaxy')).toEqual([]);
    expect(searchTabs('constructor')).toEqual([]);
  });
});
