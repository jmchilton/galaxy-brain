const VAULT_PREFIX = '../vault/';

// Path of an entry relative to the vault root, with .md stripped.
// Preserves original case and punctuation (unlike entry.id which is slugified).
export function originalRelPath(entry: { filePath?: string }): string {
  let fp = entry.filePath || '';
  if (fp.startsWith(VAULT_PREFIX)) fp = fp.slice(VAULT_PREFIX.length);
  return fp.replace(/\.md$/i, '');
}
