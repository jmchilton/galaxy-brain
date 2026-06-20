import fs from 'node:fs';
import path from 'node:path';
import { visit } from 'unist-util-visit';
import type { Root, Text, Heading, Paragraph, RootContent, PhrasingContent } from 'mdast';
import type { VFile } from 'vfile';

/**
 * Cross-references + Supporting Information cards for paper manuscripts.
 *
 * Scoped to `papers/<paper>/manuscript.md`. Three jobs:
 *   1. Anchor body figure/table captions — paragraphs that start with a bold
 *      `Figure N` / `Table N` get `id="figure-N"` / `id="table-N"`.
 *   2. Parse the sibling `supporting-information.md` contents table into download
 *      cards, appended to the manuscript's `## Supporting Information` section,
 *      each with `id="si-<type>-s<n>"`.
 *   3. Linkify inline mentions — `Figure N`, `Table N`, and SI items
 *      (`SI Recipe S1`, `Listing S1`, `Figure S2`, …) — to those anchors, but
 *      only when the target actually exists (no dangling links).
 *
 * Degrades cleanly: a paper with no `supporting-information.md` (e.g. foundry)
 * gets no cards and no SI links; figure/table linking still runs.
 */

interface SiItem {
  /** Display id, e.g. "Recipe S1". */
  label: string;
  /** Anchor slug, e.g. "si-recipe-s1". */
  id: string;
  /** Lowercased type word: recipe / workflow / data / report / figure / listing. */
  type: string;
  desc: string;
  context: string;
  href: string | null;
}

const siCache = new Map<string, SiItem[]>();

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Minimal inline markdown for table-cell prose: code spans only. */
function inlineMd(s: string): string {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
}

const SI_TYPES = ['recipe', 'workflow', 'data', 'report', 'figure', 'listing'];

function siSlug(type: string, num: string): string {
  return `si-${type.toLowerCase()}-s${num}`;
}

/** Pull an `[label](href)` out of a markdown table cell, if present. */
function cellHref(cell: string): string | null {
  const m = cell.match(/\]\(([^)]+)\)/);
  return m ? m[1].trim() : null;
}

/** Parse `supporting-information.md`'s `## Contents` table into SI items. */
function loadSi(dir: string): SiItem[] {
  if (siCache.has(dir)) return siCache.get(dir)!;
  const items: SiItem[] = [];
  const p = path.join(dir, 'supporting-information.md');
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
    // Find the table rows (first contiguous block of `|` lines after `## Contents`).
    let i = lines.findIndex(l => /^##\s+Contents\b/i.test(l));
    if (i !== -1) {
      while (i < lines.length && !lines[i].trim().startsWith('|')) i++;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      if (rows.length >= 2) {
        const header = rows[0].map(h => h.toLowerCase());
        const itemCol = header.findIndex(h => /si item|item/.test(h));
        const descCol = header.findIndex(h => /what it is/.test(h));
        const ctxCol = header.findIndex(h => /vignette|body anchor/.test(h));
        const fileCol = header.findIndex(h => /^file$/.test(h) || /file/.test(h));
        // Data rows skip header + separator (`|---|`).
        for (const row of rows.slice(2)) {
          const rawLabel = itemCol >= 0 ? row[itemCol] ?? '' : '';
          const m = rawLabel.match(/\b(Recipe|Workflow|Data|Report|Figure|Listing)\s+S(\d+)\b/i);
          if (!m) continue;
          const type = m[1].toLowerCase();
          const num = m[2];
          const href = fileCol >= 0 ? cellHref(row[fileCol] ?? '') : null;
          items.push({
            label: `${m[1]} S${num}`,
            id: siSlug(type, num),
            type,
            desc: descCol >= 0 ? row[descCol] ?? '' : '',
            context: ctxCol >= 0 ? row[ctxCol] ?? '' : '',
            href,
          });
        }
      }
    }
  }
  siCache.set(dir, items);
  return items;
}

function actionLabel(href: string): string {
  if (/\.ga($|\?)/.test(href)) return 'Download workflow';
  if (/\.ya?ml($|\?)/.test(href)) return 'Download tools';
  if (href.includes('/papers/')) return 'View recipe';
  return 'Open';
}

function siCardsHtml(items: SiItem[]): string {
  const cards = items.map(it => {
    const head =
      `<div class="si-card-head">` +
      `<span class="si-card-type si-type-${it.type}">${esc(it.label)}</span>` +
      (it.context ? `<span class="si-card-context">${esc(it.context)}</span>` : '') +
      `</div>`;
    const desc = it.desc ? `<p class="si-card-desc">${inlineMd(it.desc)}</p>` : '';
    let action = '';
    if (it.href) {
      const dl = /\.(ga|ya?ml)($|\?)/.test(it.href) ? ' download' : '';
      action = `<a class="si-card-action" href="${esc(it.href)}"${dl}>${actionLabel(it.href)} &rarr;</a>`;
    }
    return `<div class="si-card" id="${it.id}">${head}${desc}${action}</div>`;
  }).join('\n');
  return (
    `<aside class="si-downloads" aria-label="Supporting Information downloads">\n` +
    `<div class="si-card-grid">\n${cards}\n</div>\n</aside>`
  );
}

// One combined matcher for every linkable cross-reference token.
//   group 1/2: SI item type + number  (optional leading "SI ")
//   group 3:   body table number
//   group 4/5: body figure number + optional sub-letter
const XREF =
  /\b(?:SI\s+)?(Recipe|Workflow|Data|Report|Listing|Figure)\s+S(\d+)\b|\bTable\s+(\d+)\b|\bFigure\s+(\d+)([a-z])?\b/g;

export default function remarkPaperCrossrefs() {
  return function transformer(tree: Root, file: VFile) {
    const sourcePath = (file.history && file.history[0]) || file.path;
    if (!sourcePath) return;
    const norm = sourcePath.replace(/\\/g, '/');
    if (!(norm.includes('/papers/') && norm.endsWith('/manuscript.md'))) return;

    // 1. Anchor figure/table caption paragraphs. A caption is a paragraph whose
    //    first child is a bold `Figure N` / `Table N`.
    const figures = new Set<string>();
    const tables = new Set<string>();
    visit(tree, 'paragraph', (node: Paragraph) => {
      const first = node.children[0];
      if (!first || first.type !== 'strong') return;
      const lead = first.children[0];
      if (!lead || lead.type !== 'text') return;
      const m = lead.value.match(/^(Figure|Table)\s+(\d+)\b/);
      if (!m) return;
      const kind = m[1].toLowerCase();
      const num = m[2];
      const id = `${kind}-${num}`;
      const data = (node.data ??= {}) as { hProperties?: Record<string, unknown> };
      data.hProperties = { ...(data.hProperties ?? {}), id };
      (kind === 'figure' ? figures : tables).add(num);
    });

    // 2. Parse SI items.
    const si = loadSi(path.dirname(sourcePath));
    const siIds = new Set(si.map(it => it.id));

    // 3. Linkify inline cross-references.
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || index === undefined) return;
      // Skip bold runs — those are the captions themselves (avoid self-links).
      if (parent.type === 'strong') return;
      const value = node.value;
      if (!/(Figure|Table|Recipe|Workflow|Data|Report|Listing)/.test(value)) return;

      const out: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      XREF.lastIndex = 0;
      while ((m = XREF.exec(value)) !== null) {
        let href: string | null = null;
        let label = m[0];
        if (m[1]) {
          // SI item, e.g. "SI Recipe S1" / "Listing S1" / "Figure S2".
          const id = siSlug(m[1], m[2]);
          if (siIds.has(id)) { href = `#${id}`; }
        } else if (m[3]) {
          // Body table.
          if (tables.has(m[3])) href = `#table-${m[3]}`;
        } else if (m[4]) {
          // Body figure (sub-letter kept in the label, dropped from the anchor).
          if (figures.has(m[4])) href = `#figure-${m[4]}`;
        }
        if (!href) continue;

        if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
        out.push({ type: 'html', value: `<a class="xref" href="${href}">${esc(label)}</a>` } as PhrasingContent);
        last = m.index + m[0].length;
      }
      if (out.length === 0) return;
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
      parent.children.splice(index, 1, ...out);
      return index + out.length;
    });

    // 4. Append SI cards to the `## Supporting Information` section.
    if (si.length === 0) return;
    const siHeadIdx = tree.children.findIndex(
      (n): n is Heading => n.type === 'heading' && n.depth === 2 &&
        n.children.length === 1 && n.children[0].type === 'text' &&
        /supporting information/i.test(n.children[0].value),
    );
    if (siHeadIdx === -1) return;
    let end = siHeadIdx + 1;
    while (end < tree.children.length) {
      const n = tree.children[end];
      if (n.type === 'heading' && (n as Heading).depth <= 2) break;
      end++;
    }
    const cardsNode: RootContent = { type: 'html', value: siCardsHtml(si) } as RootContent;
    tree.children.splice(end, 0, cardsNode);
  };
}
