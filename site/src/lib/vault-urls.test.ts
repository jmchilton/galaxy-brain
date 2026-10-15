import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  findMovedRecord,
  findRecordCollisions,
  parseRecordPath,
  slugify,
  slugifyPath,
  vaultPathToSlug,
} from './vault-urls';

describe('slugify', () => {
  it('matches the existing note id convention', () => {
    expect(slugify('Component - Backend Dependency Management')).toBe('component-backend-dependency-management');
    expect(slugify('client_test_fixture_cleanup')).toBe('clienttestfixturecleanup');
    expect(slugify('Issue 17506')).toBe('issue-17506');
  });
});

describe('slugifyPath', () => {
  it('slugifies each segment and strips .md', () => {
    expect(slugifyPath('research/Component - Foo.md')).toBe('research/component-foo');
    expect(slugifyPath('projects/workflow_state')).toBe('projects/workflowstate');
  });
});

describe('parseRecordPath', () => {
  it('parses a record index', () => {
    expect(parseRecordPath('repositories/galaxy/branches/merged/client_test_fixture_cleanup/index.md')).toEqual({
      repo: 'galaxy',
      kind: 'branches',
      status: 'merged',
      id: 'client_test_fixture_cleanup',
      rest: 'index.md',
    });
  });

  it('parses nested sub-files and bare record dirs', () => {
    expect(parseRecordPath('repositories/pulsar/issues/queued/263/earlier_drafts/1/index.md')?.rest)
      .toBe('earlier_drafts/1/index.md');
    expect(parseRecordPath('repositories/galaxy/reviews/active/23223')).toMatchObject({ id: '23223', rest: '' });
  });

  it('ignores kind-level files, unknown kinds, and non-repository paths', () => {
    expect(parseRecordPath('repositories/galaxy/branches/queue_context.md')).toBeNull();
    expect(parseRecordPath('repositories/galaxy/notes/active/x/index.md')).toBeNull();
    expect(parseRecordPath('projects/foo/branches/active/x/index.md')).toBeNull();
  });
});

describe('vaultPathToSlug', () => {
  it('drops the status segment from record paths', () => {
    expect(vaultPathToSlug('repositories/galaxy/branches/active/integration_ci_paths/pr_description.md'))
      .toBe('repositories/galaxy/branches/integrationcipaths/prdescription');
  });

  it('gives a record the same slug in every status', () => {
    const active = vaultPathToSlug('repositories/galaxy/branches/active/foo_bar/index.md');
    const merged = vaultPathToSlug('repositories/galaxy/branches/merged/foo_bar/index.md');
    expect(active).toBe('repositories/galaxy/branches/foobar');
    expect(merged).toBe(active);
  });

  it('strips /index for directory notes', () => {
    expect(vaultPathToSlug('projects/workflow_state/index.md')).toBe('projects/workflowstate');
  });

  it('leaves non-record paths as plain slugs', () => {
    expect(vaultPathToSlug('research/Component - Foo.md')).toBe('research/component-foo');
    expect(vaultPathToSlug('repositories/galaxy/branches/queue_context.md'))
      .toBe('repositories/galaxy/branches/queuecontext');
  });
});

describe('filesystem helpers', () => {
  let vault: string;

  function touch(rel: string): void {
    const full = path.join(vault, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, '# x\n');
  }

  beforeEach(() => {
    vault = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-urls-'));
  });

  afterEach(() => {
    fs.rmSync(vault, { recursive: true, force: true });
  });

  describe('findMovedRecord', () => {
    it('finds a record that moved to another status', () => {
      touch('repositories/galaxy/branches/merged/foo/index.md');
      expect(findMovedRecord(vault, 'repositories/galaxy/branches/active/foo/index.md'))
        .toBe('repositories/galaxy/branches/merged/foo/index.md');
    });

    it('requires the sub-path to exist in the moved record', () => {
      touch('repositories/galaxy/branches/merged/foo/index.md');
      expect(findMovedRecord(vault, 'repositories/galaxy/branches/active/foo/missing.md')).toBeNull();
    });

    it('returns null for unknown records and non-record paths', () => {
      touch('repositories/galaxy/branches/merged/foo/index.md');
      expect(findMovedRecord(vault, 'repositories/galaxy/branches/active/bar/index.md')).toBeNull();
      expect(findMovedRecord(vault, 'research/missing.md')).toBeNull();
    });
  });

  describe('findRecordCollisions', () => {
    it('reports a record present under two statuses', () => {
      touch('repositories/galaxy/branches/active/foo/index.md');
      touch('repositories/galaxy/branches/merged/foo/index.md');
      touch('repositories/galaxy/branches/merged/bar/index.md');
      touch('repositories/galaxy/issues/queued/foo/index.md');
      expect(findRecordCollisions(vault)).toEqual([
        { repo: 'galaxy', kind: 'branches', id: 'foo', statuses: ['active', 'merged'] },
      ]);
    });

    it('reports ids that differ on disk but share a URL', () => {
      touch('repositories/galaxy/branches/active/foo_bar/index.md');
      touch('repositories/galaxy/branches/merged/foobar/index.md');
      expect(findRecordCollisions(vault)).toEqual([
        { repo: 'galaxy', kind: 'branches', id: 'foo_bar', statuses: ['active', 'merged'] },
      ]);
    });

    it('ignores leftover directories without markdown', () => {
      touch('repositories/galaxy/branches/merged/foo/index.md');
      fs.mkdirSync(path.join(vault, 'repositories/galaxy/branches/active/foo/screenshots'), { recursive: true });
      fs.writeFileSync(path.join(vault, 'repositories/galaxy/branches/active/foo/.DS_Store'), '');
      fs.writeFileSync(path.join(vault, 'repositories/galaxy/branches/active/foo/screenshots/a.png'), '');
      expect(findRecordCollisions(vault)).toEqual([]);
    });

    it('ignores kind-level files and a missing repositories dir', () => {
      expect(findRecordCollisions(vault)).toEqual([]);
      touch('repositories/galaxy/branches/queue_context.md');
      expect(findRecordCollisions(vault)).toEqual([]);
    });
  });
});
