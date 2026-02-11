import type { CollectionEntry } from 'astro:content';

/** Map from slugified note basename → full entry ID */
export function buildWikiLinkMap(entries: CollectionEntry<'vault'>[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    // entry.id is like "research/component-backend-dependency-management"
    const basename = entry.id.split('/').pop()!;
    map.set(basename, entry.id);
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
  linkMap: Map<string, string>,
  base: string
): { href: string | null; label: string } {
  const label = stripBrackets(wikiLink);
  const slug = slugify(label);

  // Exact match first
  if (linkMap.has(slug)) {
    return { href: `${base}/${linkMap.get(slug)!}/`, label };
  }

  // Prefix match: find entries whose basename starts with the slug
  for (const [basename, id] of linkMap) {
    if (basename.startsWith(slug)) {
      return { href: `${base}/${id}/`, label };
    }
  }

  return { href: null, label };
}
