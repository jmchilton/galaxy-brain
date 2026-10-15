import { describe, expect, it } from 'vitest';
import { buildRepositories, groupByStatus, recordTitle } from './repository-records';
import { vaultPathToSlug } from './vault-urls';

function entry(rel: string, body = '') {
  return { id: vaultPathToSlug(rel), filePath: `../vault/${rel}`, body };
}

const entries = [
  entry('repositories/galaxy/branches/active/integration_ci_paths/index.md', '# integration_ci_paths\n\nStatus: `ci_wait`.'),
  entry('repositories/galaxy/branches/active/integration_ci_paths/pr_description.md'),
  entry('repositories/galaxy/branches/merged/client_test_fixture_cleanup/index.md', 'no heading here'),
  entry('repositories/galaxy/branches/queue_context.md'),
  entry('repositories/galaxy/reviews/active/23223/index.md', '# Galaxy #23223 — Docker user\n'),
  entry('repositories/galaxy/reviews/archived/9999/index.md'),
  entry('repositories/galaxy/reviews/active/23560/index.md'),
  entry('repositories/pulsar/issues/queued/263/research.md'),
];

describe('recordTitle', () => {
  it('uses the first H1', () => {
    expect(recordTitle('intro\n# The Title\n## Sub')).toBe('The Title');
  });

  it('returns null without an H1', () => {
    expect(recordTitle('## Only h2')).toBeNull();
    expect(recordTitle(undefined)).toBeNull();
  });
});

describe('buildRepositories', () => {
  const repos = buildRepositories(entries);

  it('lists repositories alphabetically', () => {
    expect(repos.map(r => r.name)).toEqual(['galaxy', 'pulsar']);
  });

  it('builds records with status-free slugs and original names', () => {
    const galaxy = repos[0];
    const ci = galaxy.records.find(r => r.name === 'integration_ci_paths')!;
    expect(ci).toMatchObject({
      repo: 'galaxy',
      kind: 'branches',
      status: 'active',
      slug: 'repositories/galaxy/branches/integrationcipaths',
      originalDir: 'repositories/galaxy/branches/active/integration_ci_paths',
      title: 'integration_ci_paths',
    });
    expect(ci.index?.filePath).toContain('integration_ci_paths/index.md');
    expect(ci.files).toHaveLength(2);
  });

  it('falls back to the record name for the title', () => {
    const merged = repos[0].records.find(r => r.name === 'client_test_fixture_cleanup')!;
    expect(merged.title).toBe('client_test_fixture_cleanup');
    const noIndex = repos[1].records[0];
    expect(noIndex.index).toBeUndefined();
    expect(noIndex.title).toBe('263');
  });

  it('keeps kind-level files outside records', () => {
    expect(repos[0].otherFiles.map(f => f.id)).toEqual(['repositories/galaxy/branches/queuecontext']);
  });
});

describe('groupByStatus', () => {
  const galaxy = buildRepositories(entries)[0];

  it('orders known statuses first and sorts numeric ids descending', () => {
    const reviews = groupByStatus(galaxy.records, 'reviews');
    expect(reviews.map(g => g.status)).toEqual(['active', 'archived']);
    expect(reviews[0].records.map(r => r.name)).toEqual(['23560', '23223']);
  });

  it('omits empty statuses and kinds', () => {
    expect(groupByStatus(galaxy.records, 'branches').map(g => g.status)).toEqual(['active', 'merged']);
    expect(groupByStatus(galaxy.records, 'issues')).toEqual([]);
  });

  it('appends unknown statuses after known ones', () => {
    const records = buildRepositories([
      entry('repositories/x/issues/someday/1/index.md'),
      entry('repositories/x/issues/wip/2/index.md'),
    ])[0].records;
    expect(groupByStatus(records, 'issues').map(g => g.status)).toEqual(['wip', 'someday']);
  });
});
