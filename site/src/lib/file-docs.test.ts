import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  fileDocPath,
  fileDocSummary,
  globToRegExp,
  loadFileDocs,
  parseFileDocs,
  recordRelPath,
  resolveFileDoc,
} from './file-docs';

const GALAXY = `# Galaxy Branch File Docs

## index.md
Galaxy debrief. Links supporting files.

## \`pr_description.md\`, pr_titles.md
PR text.

\`\`\`md
## not-a-section.md
\`\`\`

## subagents/**
Subagent debriefs.
`;

const DEFAULTS = `# Branch File Docs

Intro paragraph.

## index.md
Default debrief.

## screenshots/
Local captures.

## *.md
Anything else.
`;

describe('parseFileDocs', () => {
  const docs = parseFileDocs(GALAXY);

  it('reads the title and one section per heading', () => {
    expect(docs.title).toBe('Galaxy Branch File Docs');
    expect(docs.sections.map(s => s.heading)).toEqual(['index.md', '`pr_description.md`, pr_titles.md', 'subagents/**']);
  });

  it('strips backticks and splits comma-separated patterns', () => {
    expect(docs.sections[1].patterns).toEqual(['pr_description.md', 'pr_titles.md']);
  });

  it('ignores headings inside code fences', () => {
    expect(docs.sections[1].body).toContain('## not-a-section.md');
  });

  it('trims section bodies', () => {
    expect(docs.sections[0].body).toBe('Galaxy debrief. Links supporting files.');
  });

  it('handles a missing title', () => {
    expect(parseFileDocs('## a.md\nA.').title).toBeNull();
  });
});

describe('globToRegExp', () => {
  const matches = (pattern: string, rel: string) => globToRegExp(pattern).test(rel);

  it('matches exact names only', () => {
    expect(matches('index.md', 'index.md')).toBe(true);
    expect(matches('index.md', 'subagents/index.md')).toBe(false);
    expect(matches('index.md', 'indexXmd')).toBe(false);
  });

  it('keeps * within one path segment', () => {
    expect(matches('review-*.md', 'review-2026-10-11.md')).toBe(true);
    expect(matches('*.md', 'subagents/review.md')).toBe(false);
  });

  it('lets ** cross segments and match nothing', () => {
    expect(matches('earlier_drafts/**', 'earlier_drafts/1/pr_description.md')).toBe(true);
    expect(matches('earlier_drafts/**', 'earlier_drafts/')).toBe(true);
    expect(matches('**/notes.md', 'notes.md')).toBe(true);
    expect(matches('**/notes.md', 'a/b/notes.md')).toBe(true);
  });

  it('matches folder pages by trailing slash', () => {
    expect(matches('screenshots/', 'screenshots/')).toBe(true);
    expect(matches('screenshots/', 'screenshots/a.md')).toBe(false);
  });
});

describe('resolveFileDoc', () => {
  const galaxy = { source: 'repositories/galaxy/branches/FILE_DOCS', docs: parseFileDocs(GALAXY) };
  const defaults = { source: 'repositories/_defaults/branches/FILE_DOCS', docs: parseFileDocs(DEFAULTS) };

  it('prefers the repository section over the default with the same pattern', () => {
    const doc = resolveFileDoc([galaxy, defaults], 'index.md')!;
    expect(doc.source).toBe(galaxy.source);
    expect(doc.section.body).toBe('Galaxy debrief. Links supporting files.');
  });

  it('checks every repository section before any default', () => {
    expect(resolveFileDoc([galaxy, defaults], 'pr_titles.md')!.source).toBe(galaxy.source);
  });

  it('falls back to defaults in document order', () => {
    expect(resolveFileDoc([galaxy, defaults], 'screenshots/')!.section.heading).toBe('screenshots/');
    expect(resolveFileDoc([galaxy, defaults], 'plan.md')!.section.heading).toBe('*.md');
  });

  it('returns null without a match', () => {
    expect(resolveFileDoc([galaxy], 'plan.md')).toBeNull();
    expect(resolveFileDoc([], 'index.md')).toBeNull();
  });
});

describe('recordRelPath', () => {
  const dir = 'repositories/galaxy/branches/active/x';

  it('maps the record root to index.md', () => {
    expect(recordRelPath(dir, dir, true)).toBe('index.md');
  });

  it('maps files and folders below the record', () => {
    expect(recordRelPath(dir, `${dir}/subagents/review`, false)).toBe('subagents/review.md');
    expect(recordRelPath(dir, `${dir}/subagents`, true)).toBe('subagents/');
  });
});

describe('fileDocSummary', () => {
  it('returns the first sentence as plain text', () => {
    expect(fileDocSummary('Proposed PR body; follow [GX_PR_DESCRIPTIONS](https://x/y.md). More `detail`.'))
      .toBe('Proposed PR body; follow GX_PR_DESCRIPTIONS.');
  });

  it('uses only the first paragraph', () => {
    expect(fileDocSummary('One `index.md` per record\n\nSecond paragraph.')).toBe('One index.md per record');
  });
});

describe('loadFileDocs', () => {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'file-docs-'));
  const write = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(vault, rel)), { recursive: true });
    fs.writeFileSync(path.join(vault, rel), text);
  };
  write('repositories/galaxy/branches/FILE_DOCS.md', GALAXY);
  write('repositories/_defaults/branches/FILE_DOCS.md', DEFAULTS);

  it('loads repository docs before defaults', () => {
    expect(loadFileDocs(vault, 'galaxy', 'branches').map(d => d.source)).toEqual([
      'repositories/galaxy/branches/FILE_DOCS',
      'repositories/_defaults/branches/FILE_DOCS',
    ]);
  });

  it('skips missing files', () => {
    expect(loadFileDocs(vault, 'pulsar', 'branches').map(d => d.source)).toEqual([fileDocPath('_defaults', 'branches')]);
    expect(loadFileDocs(vault, 'pulsar', 'reviews')).toEqual([]);
  });
});
