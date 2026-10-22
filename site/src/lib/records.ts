// Repository record paths, statuses and grouping. Dependency-free: shared with
// the Obsidian plugin (obsidian-plugin/), which runs without Node on mobile.

export const RECORD_KINDS = ['branches', 'issues', 'reviews'] as const;
export type RecordKind = typeof RECORD_KINDS[number];

// `_defaults` holds only the default File Docs; it isn't a tracked repository.
export const DEFAULTS_REPO = '_defaults';

export interface RecordPath {
  repo: string;
  kind: RecordKind;
  status: string;
  id: string;
  rest: string;
}

/** Parse `repositories/<repo>/<kind>/<status>/<id>/<rest>`; null for anything else. */
export function parseRecordPath(rel: string): RecordPath | null {
  const parts = rel.split('/');
  if (parts[0] !== 'repositories' || parts.length < 5) return null;
  const kind = parts[2] as RecordKind;
  if (!RECORD_KINDS.includes(kind)) return null;
  return { repo: parts[1], kind, status: parts[3], id: parts[4], rest: parts.slice(5).join('/') };
}

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

// Finished statuses; collapsed by default on repository pages.
const TERMINAL_STATUSES = new Set(['merged', 'abandoned', 'archived', 'closed']);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export function recordTitle(body: string | undefined): string | null {
  const m = body?.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1] : null;
}

function compareNames(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isInteger(na) && Number.isInteger(nb)) return nb - na;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

interface GroupableRecord {
  kind: RecordKind;
  status: string;
  name: string;
}

export function groupByStatus<R extends GroupableRecord>(
  records: R[],
  kind: RecordKind,
): Array<{ status: string; records: R[] }> {
  const byStatus = new Map<string, R[]>();
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
