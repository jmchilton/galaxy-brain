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

/** Vault path of the queue file that groups a repository's records of a kind; it may not exist. */
export function groupingFor(repo: string, kind: RecordKind): string | undefined {
  return kind === 'branches' ? `repositories/${repo}/branches/MY_BRANCHES.md` : undefined;
}

export interface GroupingSection {
  key: string;
  label: string;
  /** Record names linked from the section's list items, in order. */
  names: string[];
}

/** Resolve a relative link against the directory of `from`, both vault paths. */
function resolveLink(from: string, link: string): string {
  const parts = from.split('/').slice(0, -1);
  for (const part of link.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

/** `## Label (`key`)` sections, each listing records via `- [..](relative/path)` items. */
export function parseGrouping(text: string, path: string, repo: string, kind: RecordKind): GroupingSection[] {
  const sections: GroupingSection[] = [];
  for (const line of text.split('\n')) {
    const heading = line.match(/^## (.+?)\s*\(`([^`]+)`\)\s*$/);
    if (heading) {
      sections.push({ label: heading[1]!, key: heading[2]!, names: [] });
      continue;
    }
    const link = line.match(/^- \[[^\]]*\]\(([^)\s]+)\)/);
    const section = sections[sections.length - 1];
    if (!link || !section) continue;
    const record = parseRecordPath(resolveLink(path, decodeURI(link[1]!)));
    if (record?.rest && record.repo === repo && record.kind === kind && !section.names.includes(record.id)) section.names.push(record.id);
  }
  return sections;
}

/** Records of a kind in the grouping's non-empty sections, each once, plus the unlisted rest. */
export function groupBySections<R extends GroupableRecord>(
  records: R[],
  kind: RecordKind,
  grouping: GroupingSection[] | undefined,
): { sections: Array<{ key: string; label: string; records: R[] }>; rest: R[] } {
  const ofKind = records.filter(record => record.kind === kind);
  const byName = new Map(ofKind.map(record => [record.name, record]));
  const listed = new Set<string>();
  const sections = (grouping ?? []).flatMap(section => {
    const found = section.names.flatMap(name => {
      const record = byName.get(name);
      if (!record || listed.has(name)) return [];
      listed.add(name);
      return [record];
    });
    return found.length ? [{ key: section.key, label: section.label, records: found }] : [];
  });
  return { sections, rest: ofKind.filter(record => !listed.has(record.name)) };
}
