import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import remarkGithubAlerts from './remark-github-alerts';

function render(md: string): string {
  return String(unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubAlerts)
    .use(remarkRehype)
    .use(rehypeStringify)
    .processSync(md));
}

describe('remarkGithubAlerts', () => {
  it('turns a GitHub alert blockquote into a callout aside and drops the marker', () => {
    expect(render('> [!TIP]\n> **Why:** baseline tests first.')).toBe(
      '<aside class="callout callout-tip">\n<p><strong>Why:</strong> baseline tests first.</p>\n</aside>',
    );
  });

  it('handles each alert type, case-insensitively', () => {
    for (const kind of ['note', 'important', 'warning', 'caution']) {
      expect(render(`> [!${kind.toUpperCase()}]\n> Text.`)).toContain(`<aside class="callout callout-${kind}">`);
    }
    expect(render('> [!tip]\n> Text.')).toContain('<aside class="callout callout-tip">');
  });

  it('leaves plain and unknown-marker blockquotes alone', () => {
    expect(render('> Just a quote.')).toBe('<blockquote>\n<p>Just a quote.</p>\n</blockquote>');
    expect(render('> [!FOO]\n> Text.')).toContain('<blockquote>');
  });

  it('only matches the marker at the start of the blockquote', () => {
    expect(render('> Text with [!TIP] inside.')).toContain('<blockquote>');
  });
});
