import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import type { Root, Image, Parent } from 'mdast';
import type { VFile } from 'vfile';

/**
 * Replaces relative images whose file is missing with a text placeholder.
 * Astro fails the whole build on a missing markdown image, and branch records
 * reference screenshots that are deliberately kept out of git — they exist in
 * a local checkout but not in CI.
 */
export default function remarkMissingImages() {
  return function transformer(tree: Root, file: VFile) {
    const sourcePath = (file.history && file.history[0]) || file.path;
    if (!sourcePath) return;
    const sourceDir = path.dirname(path.resolve(sourcePath));

    visit(tree, 'image', (node: Image, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      const url = node.url;
      if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('/')) return;

      const pathPart = url.split(/[#?]/)[0];
      let decoded: string;
      try {
        decoded = decodeURIComponent(pathPart);
      } catch {
        decoded = pathPart;
      }
      if (fs.existsSync(path.resolve(sourceDir, decoded))) return;

      const label = node.alt ? `${node.alt} (${url})` : url;
      parent.children.splice(index, 1, {
        type: 'emphasis',
        children: [{ type: 'text', value: `[image not published: ${label}]` }],
      });
    });
  };
}
