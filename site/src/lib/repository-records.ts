import { DEFAULTS_REPO } from './file-docs';
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

// `_defaults` holds only the default File Docs; it isn't a tracked repository.
export function listedRepositories<E extends RepoEntry>(repos: Repository<E>[]): Repository<E>[] {
  return repos.filter(repo => repo.name !== DEFAULTS_REPO);
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

export interface TrailItem {
  label: string;
  // Site path without base, e.g. `repositories/galaxy/`.
  href?: string;
}

export interface RepositoryPage<E extends RepoEntry> {
  slug: string;
  repo: Repository<E>;
  record?: RepositoryRecord<E>;
  // Original vault-relative path of the page's file (no .md) or directory.
  originalPath: string;
  title: string;
  entry?: E;
  // Directory pages only: files below the directory, excluding its own index.
  children?: E[];
  // Breadcrumbs after Home.
  trail: TrailItem[];
}

/**
 * Pages under a repository: every record directory (root and nested) shows its
 * index.md, if any, plus a tree of the files below it; other markdown files get
 * their own page. Throws if two sources map to one URL.
 */
export function repositoryPages<E extends RepoEntry>(repos: Repository<E>[]): RepositoryPage<E>[] {
  const pages = new Map<string, RepositoryPage<E>>();
  const add = (page: Omit<RepositoryPage<E>, 'slug'>) => {
    const slug = vaultPathToSlug(page.originalPath);
    const existing = pages.get(slug);
    if (existing) {
      throw new Error(`Two repository pages map to /${slug}/: ${existing.originalPath} and ${page.originalPath}`);
    }
    pages.set(slug, { slug, ...page });
  };

  for (const repo of repos) {
    const repoTrail: TrailItem[] = [
      { label: 'Repositories', href: 'repositories/' },
      { label: repo.name, href: `${repo.slug}/` },
    ];
    for (const entry of repo.otherFiles) {
      const originalPath = originalRelPath(entry);
      const title = originalPath.split('/').slice(2).join('/');
      add({ repo, originalPath, title, entry, trail: [...repoTrail, { label: title }] });
    }
    for (const record of repo.records) {
      const recordDepth = record.originalDir.split('/').length;
      const trailTo = (originalPath: string): TrailItem[] => {
        const below = originalPath.split('/').slice(recordDepth);
        const ancestors = [record.originalDir, ...below.slice(0, -1).map((_, i) =>
          originalPath.split('/').slice(0, recordDepth + i + 1).join('/'))];
        const labels = [record.name, ...below];
        return [
          ...repoTrail,
          { label: KIND_LABELS[record.kind], href: `${repo.slug}/#${record.kind}` },
          ...ancestors.slice(0, labels.length - 1).map((dir, i) => ({ label: labels[i], href: `${vaultPathToSlug(dir)}/` })),
          { label: labels[labels.length - 1] },
        ];
      };

      const dirs = new Set<string>([record.originalDir]);
      for (const entry of record.files) {
        const parts = originalRelPath(entry).split('/');
        for (let i = recordDepth + 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
      }
      for (const dir of dirs) {
        const index = record.files.find(f => originalRelPath(f) === `${dir}/index`);
        const children = record.files.filter(f => f !== index && originalRelPath(f).startsWith(dir + '/'));
        const title = dir === record.originalDir ? record.title : dir.split('/').pop()!;
        add({ repo, record, originalPath: dir, title, entry: index, children, trail: trailTo(dir) });
      }
      for (const entry of record.files) {
        const originalPath = originalRelPath(entry);
        if (originalPath.split('/').pop() === 'index') continue;
        add({ repo, record, originalPath, title: originalPath.split('/').pop()!, entry, trail: trailTo(originalPath) });
      }
    }
  }
  return [...pages.values()];
}

export { RECORD_KINDS };
