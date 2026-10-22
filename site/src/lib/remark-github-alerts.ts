import { visit } from 'unist-util-visit';
import type { Blockquote, Root } from 'mdast';

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/i;

/** Render GitHub alert blockquotes (`> [!TIP]`) as `<aside class="callout callout-tip">`. */
export default function remarkGithubAlerts() {
  return function transformer(tree: Root) {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const para = node.children[0];
      if (para?.type !== 'paragraph') return;
      const first = para.children[0];
      if (first?.type !== 'text') return;
      const m = MARKER.exec(first.value);
      if (!m) return;
      first.value = first.value.slice(m[0].length);
      if (first.value === '') para.children.shift();
      if (para.children.length === 0) node.children.shift();
      const kind = m[1].toLowerCase();
      node.data = { ...node.data, hName: 'aside', hProperties: { className: ['callout', `callout-${kind}`] } };
    });
  };
}
