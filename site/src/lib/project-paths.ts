import type { CollectionEntry } from 'astro:content';

const VAULT_PREFIX = '../vault/';

// Path of an entry relative to the vault root, with .md stripped.
// Preserves original case and punctuation (unlike entry.id which is slugified).
export function originalRelPath(
  entry: CollectionEntry<'projectFiles'> | CollectionEntry<'paperFiles'> | CollectionEntry<'vault'>
): string {
  let fp = entry.filePath || '';
  if (fp.startsWith(VAULT_PREFIX)) fp = fp.slice(VAULT_PREFIX.length);
  return fp.replace(/\.md$/i, '');
}

// Mirror of slugifyPath segment logic in content.config.ts so we can rebuild
// folder URLs from original directory names.
export function slugifySegment(s: string): string {
  return s.toLowerCase()
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-');
}

export function slugifyPath(path: string): string {
  return path.split('/').map(slugifySegment).join('/');
}
