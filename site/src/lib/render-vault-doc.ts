import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { resolveWikiLink, type WikiLinkTarget } from './wiki-links';

const VAULT_DIR = path.resolve('../vault');

/**
 * Load a vault-root markdown file (e.g. Index.md, log.md), resolve [[wiki links]]
 * via the existing link map, and render to HTML.
 */
export function renderVaultDoc(
  filename: string,
  linkMap: Map<string, WikiLinkTarget>,
  base: string
): string {
  const raw = fs.readFileSync(path.join(VAULT_DIR, filename), 'utf-8');
  const withLinks = raw.replace(/\[\[([^\[\]]+)\]\]/g, (_, inner) => {
    const { href, label } = resolveWikiLink(`[[${inner}]]`, linkMap, base);
    return href ? `[${label}](${href})` : `**${label}**`;
  });
  return marked.parse(withLinks, { async: false }) as string;
}
