import type { CollectionEntry } from 'astro:content';

export interface WikiLinkTarget {
  id: string;
  summary: string;
}

/** Map from slugified note basename → target (full entry ID + summary) */
export function buildWikiLinkMap(entries: CollectionEntry<'vault'>[]): Map<string, WikiLinkTarget> {
  const map = new Map<string, WikiLinkTarget>();
  for (const entry of entries) {
    // entry.id is like "research/component-backend-dependency-management"
    const basename = entry.id.split('/').pop()!;
    map.set(basename, { id: entry.id, summary: entry.data.summary });
  }
  return map;
}

/** Slugify a wiki link target the same way generateId does */
function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-');
}

/** Strip [[...]] brackets from a wiki link string */
function stripBrackets(wikiLink: string): string {
  return wikiLink.replace(/^\[\[/, '').replace(/\]\]$/, '');
}

/**
 * Resolve a wiki link like "[[Issue 17506]]" to a full entry href.
 * Uses prefix matching: slugified target is matched against entry basenames.
 * Returns null for dangling links.
 */
export function resolveWikiLink(
  wikiLink: string,
  linkMap: Map<string, WikiLinkTarget>,
  base: string
): { href: string | null; label: string; summary: string | null } {
  const label = stripBrackets(wikiLink);
  const slug = slugify(label);

  // Exact match first
  if (linkMap.has(slug)) {
    const t = linkMap.get(slug)!;
    return { href: `${base}/${t.id}/`, label, summary: t.summary };
  }

  // Prefix match: find entries whose basename starts with the slug
  for (const [basename, target] of linkMap) {
    if (basename.startsWith(slug)) {
      return { href: `${base}/${target.id}/`, label, summary: target.summary };
    }
  }

  return { href: null, label, summary: null };
}

/** Resolve a wiki link to just the target entry ID (or null). */
export function resolveWikiLinkId(
  wikiLink: string,
  linkMap: Map<string, WikiLinkTarget>
): string | null {
  const label = stripBrackets(wikiLink);
  const slug = slugify(label);
  if (linkMap.has(slug)) return linkMap.get(slug)!.id;
  for (const [basename, target] of linkMap) {
    if (basename.startsWith(slug)) return target.id;
  }
  return null;
}

export type BacklinkField = 'parent_plan' | 'related_notes' | 'related_issues';

export interface Backlink {
  sourceId: string;
  field: BacklinkField;
}

/** Build a map: target entry ID → list of notes that link to it via frontmatter wiki-link fields. */
export function buildBacklinkMap(
  entries: CollectionEntry<'vault'>[],
  linkMap: Map<string, WikiLinkTarget>
): Map<string, Backlink[]> {
  const map = new Map<string, Backlink[]>();
  const add = (targetId: string, sourceId: string, field: BacklinkField) => {
    if (targetId === sourceId) return;
    const list = map.get(targetId) ?? [];
    if (!list.some(b => b.sourceId === sourceId && b.field === field)) {
      list.push({ sourceId, field });
    }
    map.set(targetId, list);
  };
  for (const entry of entries) {
    const { data } = entry;
    const singles: [BacklinkField, string | undefined][] = [
      ['parent_plan', data.parent_plan],
    ];
    for (const [field, val] of singles) {
      if (!val) continue;
      const tid = resolveWikiLinkId(val, linkMap);
      if (tid) add(tid, entry.id, field);
    }
    const arrays: [BacklinkField, string[] | undefined][] = [
      ['related_notes', data.related_notes],
      ['related_issues', data.related_issues],
    ];
    for (const [field, arr] of arrays) {
      if (!arr) continue;
      for (const wl of arr) {
        const tid = resolveWikiLinkId(wl, linkMap);
        if (tid) add(tid, entry.id, field);
      }
    }
  }
  return map;
}
