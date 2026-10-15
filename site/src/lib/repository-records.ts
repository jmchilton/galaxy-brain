import { originalRelPath } from './project-paths';
import { RECORD_KINDS, parseRecordPath, vaultPathToSlug } from './vault-urls';
import type { RecordKind } from './vault-urls';

// Groups `repositoryFiles` entries into repositories and branch/issue/review
// records for the repository pages.

export const KIND_LABELS: Record<RecordKind, string> = {
  branches: 'Branches',
  issues: 'Issues',
  reviews: 'Reviews',
};

// Directory statuses as documented in vault/agents/_shared/REPOSITORY_*.md.
// Unlisted statuses still render, after these.
export const STATUS_ORDER: Record<RecordKind, string[]> = {
  branches: ['active', 'merged', 'abandoned'],
  issues: ['needs_decision', 'queued', 'wip', 'blocked', 'delegated', 'closed'],
  reviews: ['active', 'archived'],
};

// Reuses the note status badge palette (global.css `.badge-*`).
const STATUS_BADGES: Record<string, string> = {
  active: 'revised',
  queued: 'revised',
  wip: 'revised',
  needs_decision: 'draft',
  blocked: 'draft',
  merged: 'reviewed',
  abandoned: 'stale',
  archived: 'archived',
  closed: 'archived',
  delegated: 'archived',
};

export function statusBadgeClass(status: string): string {
  return `badge badge-${STATUS_BADGES[status] ?? 'archived'}`;
}

// Finished statuses; collapsed by default on repository pages.
const TERMINAL_STATUSES = new Set(['merged', 'abandoned', 'archived', 'closed']);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export interface RepoEntry {
  id: string;
  filePath?: string;
  body?: string;
}

export interface RepositoryRecord<E extends RepoEntry> {
  repo: string;
  kind: RecordKind;
  status: string;
  name: string;
  slug: string;
  originalDir: string;
  title: string;
  index?: E;
  files: E[];
}

export interface Repository<E extends RepoEntry> {
  name: string;
  slug: string;
  records: RepositoryRecord<E>[];
  otherFiles: E[];
}

export function recordTitle(body: string | undefined): string | null {
  const m = body?.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1] : null;
}

export function buildRepositories<E extends RepoEntry>(entries: E[]): Repository<E>[] {
  const repos = new Map<string, Repository<E>>();
  const records = new Map<string, RepositoryRecord<E>>();

  for (const entry of entries) {
    const rel = originalRelPath(entry) + '.md';
    const repoName = rel.split('/')[1];
    if (!repos.has(repoName)) repos.set(repoName, {
      name: repoName,
      slug: vaultPathToSlug(`repositories/${repoName}`),
      records: [],
      otherFiles: [],
    });
    const repo = repos.get(repoName)!;

    const parsed = parseRecordPath(rel);
    if (!parsed || !parsed.rest) {
      repo.otherFiles.push(entry);
      continue;
    }
    const originalDir = ['repositories', parsed.repo, parsed.kind, parsed.status, parsed.id].join('/');
    let record = records.get(originalDir);
    if (!record) {
      record = {
        repo: parsed.repo,
        kind: parsed.kind,
        status: parsed.status,
        name: parsed.id,
        slug: vaultPathToSlug(originalDir),
        originalDir,
        title: parsed.id,
        files: [],
      };
      records.set(originalDir, record);
      repo.records.push(record);
    }
    record.files.push(entry);
    if (parsed.rest === 'index.md') {
      record.index = entry;
      record.title = recordTitle(entry.body) ?? parsed.id;
    }
  }

  return [...repos.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function compareNames(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isInteger(na) && Number.isInteger(nb)) return nb - na;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function groupByStatus<E extends RepoEntry>(
  records: RepositoryRecord<E>[],
  kind: RecordKind,
): Array<{ status: string; records: RepositoryRecord<E>[] }> {
  const byStatus = new Map<string, RepositoryRecord<E>[]>();
  for (const record of records) {
    if (record.kind !== kind) continue;
    byStatus.set(record.status, [...(byStatus.get(record.status) ?? []), record]);
  }
  const known = STATUS_ORDER[kind];
  const statuses = [...byStatus.keys()].sort((a, b) => {
    const ia = known.indexOf(a);
    const ib = known.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
  return statuses.map(status => ({
    status,
    records: byStatus.get(status)!.sort((a, b) => compareNames(a.name, b.name)),
  }));
}

export { RECORD_KINDS };
