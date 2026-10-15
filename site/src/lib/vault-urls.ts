import fs from 'node:fs';
import path from 'node:path';

// Single source of truth for mapping vault paths to site URL slugs. Used by
// content collection ids, remark link rewriting, and page/file-tree hrefs.

export const RECORD_KINDS = ['branches', 'issues', 'reviews'] as const;
export type RecordKind = typeof RECORD_KINDS[number];

export function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-');
}

export function slugifyPath(rel: string): string {
  return rel.replace(/\.md$/, '').split('/').map(slugify).join('/');
}

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

/**
 * Site slug for a vault-relative path. Record paths drop their status segment
 * so a record keeps one URL as it moves between status directories.
 */
export function vaultPathToSlug(rel: string): string {
  const record = parseRecordPath(rel);
  const stable = record
    ? ['repositories', record.repo, record.kind, record.id, record.rest].filter(Boolean).join('/')
    : rel;
  let slug = slugifyPath(stable);
  if (slug.endsWith('/index')) slug = slug.slice(0, -'/index'.length);
  return slug;
}

function subdirs(dir: string): string[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(ent => ent.isDirectory())
      .map(ent => ent.name)
      .sort();
  } catch {
    return [];
  }
}

/** For a record path that no longer exists, the same record path under another status. */
export function findMovedRecord(vaultDir: string, rel: string): string | null {
  const record = parseRecordPath(rel);
  if (!record) return null;
  const kindDir = path.join('repositories', record.repo, record.kind);
  for (const status of subdirs(path.join(vaultDir, kindDir))) {
    if (status === record.status) continue;
    const candidate = path.join(kindDir, status, record.id, record.rest);
    if (fs.existsSync(path.join(vaultDir, candidate))) return candidate.split(path.sep).join('/');
  }
  return null;
}

export interface RecordCollision {
  repo: string;
  kind: RecordKind;
  id: string;
  statuses: string[];
}

/** Records present under more than one status directory (e.g. a half-finished move). */
export function findRecordCollisions(vaultDir: string): RecordCollision[] {
  const collisions: RecordCollision[] = [];
  const reposDir = path.join(vaultDir, 'repositories');
  for (const repo of subdirs(reposDir)) {
    for (const kind of RECORD_KINDS) {
      const kindDir = path.join(reposDir, repo, kind);
      const statusesById = new Map<string, string[]>();
      for (const status of subdirs(kindDir)) {
        for (const id of subdirs(path.join(kindDir, status))) {
          statusesById.set(id, [...(statusesById.get(id) ?? []), status]);
        }
      }
      for (const [id, statuses] of statusesById) {
        if (statuses.length > 1) collisions.push({ repo, kind, id, statuses });
      }
    }
  }
  return collisions;
}
