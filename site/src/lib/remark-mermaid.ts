import { visit } from 'unist-util-visit';
import type { Root, Code, Html } from 'mdast';

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

export default function remarkMermaid() {
  return function transformer(tree: Root) {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;
      const html: Html = {
        type: 'html',
        value: `<div class="mermaid not-prose">${escapeHtml(node.value)}</div>`,
      };
      (parent.children as Html[]).splice(index, 1, html);
    });
  };
}
