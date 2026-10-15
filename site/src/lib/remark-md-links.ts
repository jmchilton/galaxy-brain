import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import type { Root, Link } from 'mdast';
import type { VFile } from 'vfile';
import { findMovedRecord, vaultPathToSlug } from './vault-urls';

interface Options {
  vaultDir: string;
  base: string;
}

/**
 * Rewrites relative markdown links (e.g. `[X](FOO.md)`, `[Y](../bar/baz.md#anchor)`)
 * into published site URLs. Resolves the link's path against the source file's
 * directory, then maps it through the same slug logic Astro's content
 * collections use. Leaves the link untouched if the target file isn't in the
 * vault on disk — so existing 404s stay visible rather than being rewritten
 * into a different 404. Exception: a link to a repository record that has since
 * moved status directories resolves to the record's (status-free) URL, with a
 * build warning so the vault link can be fixed.
 */
export default function remarkMdLinks(opts: Options) {
  const vaultAbs = path.resolve(opts.vaultDir);
  const baseTrim = opts.base.replace(/\/$/, '');

  return function transformer(tree: Root, file: VFile) {
    const sourcePath = (file.history && file.history[0]) || file.path;
    if (!sourcePath) return;
    const sourceDir = path.dirname(path.resolve(sourcePath));

    visit(tree, 'link', (node: Link) => {
      const url = node.url;
      if (!url) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return; // protocol (http:, mailto:, etc.)
      if (url.startsWith('/')) return;               // already site-absolute
      if (url.startsWith('#')) return;               // pure anchor

      const splitIdx = url.search(/[#?]/);
      const pathPart = splitIdx >= 0 ? url.slice(0, splitIdx) : url;
      const suffix = splitIdx >= 0 ? url.slice(splitIdx) : '';

      if (!pathPart.endsWith('.md')) return;

      let decoded: string;
      try {
        decoded = decodeURIComponent(pathPart);
      } catch {
        decoded = pathPart;
      }

      const absTarget = path.resolve(sourceDir, decoded);
      if (!absTarget.startsWith(vaultAbs + path.sep)) return;

      const relFromVault = path.relative(vaultAbs, absTarget).split(path.sep).join('/');
      if (!fs.existsSync(absTarget)) {
        const moved = findMovedRecord(vaultAbs, relFromVault);
        if (!moved) return;
        console.warn(`[remark-md-links] stale record link in ${path.relative(vaultAbs, sourcePath)}: ${relFromVault} -> ${moved}`);
      }

      node.url = `${baseTrim}/${vaultPathToSlug(relFromVault)}/${suffix}`;
    });
  };
}
