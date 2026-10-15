import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { globSync } from 'tinyglobby';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PAPER_FILES_PATTERN,
  PROJECT_FILES_PATTERN,
  REPOSITORY_FILES_PATTERN,
  VAULT_PATTERN,
} from './collection-patterns';

const FILES = [
  'research/note.md',
  'Dashboard.md',
  'agents/gx_branches/TICK.md',
  'templates/research.md',
  'projects/cwl/index.md',
  'projects/cwl/notes.md',
  'projects/cwl/sub/index.md',
  'projects/cwl/reviews/index-independent-review.md',
  'projects/cwl/shot.png',
  'papers/gxwf/index.md',
  'papers/gxwf/manuscript.md',
  'repositories/galaxy/branches/active/foo/index.md',
  'repositories/galaxy/branches/active/foo/run.log',
];

let vault: string;

// Same options Astro's glob() loader passes to tinyglobby.
function match(pattern: string[]): string[] {
  return globSync(pattern, { cwd: vault, expandDirectories: false }).sort();
}

beforeAll(() => {
  vault = fs.mkdtempSync(path.join(os.tmpdir(), 'collection-patterns-'));
  for (const rel of FILES) {
    fs.mkdirSync(path.join(vault, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(vault, rel), '');
  }
});

afterAll(() => {
  fs.rmSync(vault, { recursive: true, force: true });
});

describe('collection patterns', () => {
  it('vault keeps notes and project/paper index pages only', () => {
    expect(match(VAULT_PATTERN)).toEqual([
      'papers/gxwf/index.md',
      'projects/cwl/index.md',
      'projects/cwl/sub/index.md',
      'research/note.md',
    ]);
  });

  it('projectFiles takes markdown sub-files, including names starting with "index"', () => {
    expect(match(PROJECT_FILES_PATTERN)).toEqual([
      'projects/cwl/notes.md',
      'projects/cwl/reviews/index-independent-review.md',
    ]);
  });

  it('paperFiles takes markdown sub-files', () => {
    expect(match(PAPER_FILES_PATTERN)).toEqual(['papers/gxwf/manuscript.md']);
  });

  it('repositoryFiles takes record markdown only', () => {
    expect(match(REPOSITORY_FILES_PATTERN)).toEqual(['repositories/galaxy/branches/active/foo/index.md']);
  });
});
