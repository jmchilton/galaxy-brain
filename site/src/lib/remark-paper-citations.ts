import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { visit } from 'unist-util-visit';
import type { Root, Text, Heading, RootContent, PhrasingContent } from 'mdast';
import type { VFile } from 'vfile';

/**
 * Inline citation linking + generated reference list for paper manuscripts.
 *
 * Scoped to `papers/<paper>/manuscript.md`. Reads the sibling `references.yml`
 * (the canonical bibliography data kept in sync by `check_references.py`) and:
 *   1. turns inline `[Author YYYY]` / short-key citations into anchor links to
 *      `#ref-<slug>` with a hover popover carrying the full citation, and
 *   2. replaces the body under the `## References` heading with an anchored,
 *      alphabetical list of the cited works.
 *
 * Single source of truth: `references.yml` (the per-paper bibliography data).
 * The reference bullets some manuscripts carry under `## References` are
 * superseded here at render time.
 */

interface Entry {
  authors?: string;
  year?: number | string;
  title?: string;
  venue?: string;
  doi?: string;
  url?: string;
  kind?: string;
  note?: string;
}
type Bib = Record<string, Entry>;

// `[...]` that is not a wiki link (`[[...]]`), not a markdown link (`[...](...)`),
// and holds no nested brackets. Matches the linter's extraction.
const CITE_SPAN = /(?<!\[)\[([^\[\]]+)\](?!\()(?!\])/g;
const AUTHOR_YEAR = /^[A-Z].*\s\d{4}$/;

const bibCache = new Map<string, Bib | null>();

function loadBib(dir: string): Bib | null {
  if (bibCache.has(dir)) return bibCache.get(dir)!;
  const p = path.join(dir, 'references.yml');
  let bib: Bib | null = null;
  if (fs.existsSync(p)) {
    const data = yaml.load(fs.readFileSync(p, 'utf-8'));
    if (data && typeof data === 'object') bib = data as Bib;
  }
  bibCache.set(dir, bib);
  return bib;
}

// Astro's smartypants rewrites straight quotes/apostrophes to curly ones in
// text nodes before this plugin runs, so a literal `p in bib` lookup would miss
// keys like `O'Connor 2017`. Normalize both sides to straight punctuation.
function normKey(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}
function bibIndex(bib: Bib): Map<string, string> {
  const idx = new Map<string, string>();
  for (const key of Object.keys(bib)) idx.set(normKey(key), key);
  return idx;
}

function slug(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function doiUrl(e: Entry): string | undefined {
  if (e.doi) return `https://doi.org/${e.doi}`;
  return e.url;
}

/** Full citation as HTML (used in both the popover and the reference list). */
function citationHtml(e: Entry): string {
  const bits: string[] = [];
  if (e.authors) bits.push(esc(e.authors));
  if (e.year) bits.push(String(e.year));
  if (e.title) bits.push(esc(e.title));
  if (e.venue) bits.push(esc(e.venue));
  let html = bits.join('. ');
  if (html && !html.endsWith('.')) html += '.';
  const href = doiUrl(e);
  if (href) {
    const label = e.doi ? `doi:${esc(e.doi)}` : esc(href);
    html += ` <a href="${esc(href)}" target="_blank" rel="noopener">${label}</a>`;
  }
  if (e.note) html += ` <span class="cite-note">(${esc(e.note)})</span>`;
  return html;
}

/** Inline markup for one cited key: linked label + hover popover. */
function citeLink(key: string, e: Entry): string {
  return (
    `<span class="cite-wrap">` +
    `<a class="cite" href="#ref-${slug(key)}">${esc(key)}</a>` +
    `<span class="cite-pop" role="tooltip">${citationHtml(e)}</span>` +
    `</span>`
  );
}

export default function remarkPaperCitations() {
  return function transformer(tree: Root, file: VFile) {
    const sourcePath = (file.history && file.history[0]) || file.path;
    if (!sourcePath) return;
    const norm = sourcePath.replace(/\\/g, '/');
    if (!(norm.includes('/papers/') && norm.endsWith('/manuscript.md'))) return;

    const bib = loadBib(path.dirname(sourcePath));
    if (!bib) return;
    const idx = bibIndex(bib);

    const cited = new Set<string>();

    // 1. Link inline citations. Replace matching text nodes with a mix of text
    //    and inline html nodes.
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      const value = node.value;
      if (!value.includes('[')) return;

      const out: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      CITE_SPAN.lastIndex = 0;
      while ((m = CITE_SPAN.exec(value)) !== null) {
        const parts = m[1].split(';').map(s => s.trim());
        // Only treat as a citation span if at least one part resolves.
        const resolves = parts.map(p => idx.has(normKey(p)) || AUTHOR_YEAR.test(p));
        if (!resolves.some(Boolean)) continue;

        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });

        const rendered = parts.map((p) => {
          const key = idx.get(normKey(p));
          if (key) { cited.add(key); return citeLink(key, bib[key]); }
          if (AUTHOR_YEAR.test(p)) { return `<span class="cite-wrap"><a class="cite cite-missing" href="#ref-${slug(p)}">${esc(p)}</a></span>`; }
          return esc(p);
        });
        out.push({ type: 'html', value: '[' + rendered.join('; ') + ']' } as PhrasingContent);
        last = m.index + m[0].length;
      }
      if (out.length === 0) return;
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
      parent.children.splice(index, 1, ...out);
      return index + out.length;
    });

    // 2. Replace the body under `## References` with a generated list.
    const refIdx = tree.children.findIndex(
      (n): n is Heading => n.type === 'heading' && n.depth === 2 &&
        n.children.length === 1 && n.children[0].type === 'text' &&
        n.children[0].value.trim().toLowerCase() === 'references',
    );
    if (refIdx === -1) return;

    // Strip existing section body (until next depth<=2 heading or end).
    let end = refIdx + 1;
    while (end < tree.children.length) {
      const n = tree.children[end];
      if (n.type === 'heading' && (n as Heading).depth <= 2) break;
      end++;
    }

    const keys = [...cited].sort((a, b) => a.localeCompare(b));
    let listHtml: string;
    if (keys.length === 0) {
      listHtml = '<p class="reference-empty">No inline citations resolved.</p>';
    } else {
      const items = keys
        .map(k => `<li id="ref-${slug(k)}"><span class="ref-key">${esc(k)}</span> ${citationHtml(bib[k])}</li>`)
        .join('\n');
      listHtml = `<ol class="reference-list">\n${items}\n</ol>`;
    }
    const listNode: RootContent = { type: 'html', value: listHtml } as RootContent;
    tree.children.splice(refIdx + 1, end - (refIdx + 1), listNode);
  };
}
