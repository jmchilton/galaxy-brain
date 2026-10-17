import fs from 'node:fs';
import path from 'node:path';

// File Docs describe the files inside repository records. Each
// `repositories/<repo>/<kind>/FILE_DOCS.md` (and the `_defaults` repository's,
// as fallback) is a `# ` title followed by one `## <glob>` section per file
// pattern, relative to the record directory. See LIBRARY_RECORD_FILE_DOCS.md.

export const DEFAULTS_REPO = '_defaults';

export interface FileDocSection {
  heading: string;
  patterns: string[];
  body: string;
}

export interface FileDocs {
  title: string | null;
  sections: FileDocSection[];
}

export interface FileDocsSource {
  source: string; // vault-relative path without .md
  docs: FileDocs;
}

export interface ResolvedFileDoc {
  source: string;
  section: FileDocSection;
}

export function parseFileDocs(text: string): FileDocs {
  let title: string | null = null;
  const sections: FileDocSection[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  let inFence = false;

  const flush = () => {
    if (!current) return;
    const patterns = current.heading.split(',').map(p => p.trim().replace(/^`(.*)`$/, '$1')).filter(Boolean);
    sections.push({ heading: current.heading, patterns, body: current.lines.join('\n').trim() });
  };

  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const h2 = !inFence && line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      flush();
      current = { heading: h2[1], lines: [] };
      continue;
    }
    const h1 = !inFence && !current && title === null && line.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      title = h1[1];
      continue;
    }
    current?.lines.push(line);
  }
  flush();
  return { title, sections };
}

/** `*` and `?` stay within a path segment; `**` crosses segments and may match nothing. */
export function globToRegExp(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      i++;
      if (pattern[i + 1] === '/') {
        i++;
        re += '(?:.*/)?';
      } else {
        re += '.*';
      }
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

/** First matching section; sources are checked in order (repository before defaults). */
export function resolveFileDoc(sources: FileDocsSource[], rel: string): ResolvedFileDoc | null {
  for (const { source, docs } of sources) {
    for (const section of docs.sections) {
      if (section.patterns.some(p => globToRegExp(p).test(rel))) return { source, section };
    }
  }
  return null;
}

/** Path matched against File Docs patterns: the record root is `index.md`, folders end in `/`. */
export function recordRelPath(recordDir: string, originalPath: string, isFolder: boolean): string {
  if (originalPath === recordDir) return 'index.md';
  const rel = originalPath.slice(recordDir.length + 1);
  return isFolder ? `${rel}/` : `${rel}.md`;
}

/** First sentence of the first paragraph, as plain text (for hover hints). */
export function fileDocSummary(body: string): string {
  const paragraph = body.split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' ').trim();
  const plain = paragraph
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    // `_` emphasis is left alone: underscores are common in file names.
    .replace(/(\*\*|\*)(\S(?:.*?\S)?)\1/g, '$2');
  const sentence = plain.match(/^(.*?[.!?])(?:\s|$)/);
  return sentence ? sentence[1] : plain;
}

export function fileDocPath(repo: string, kind: string): string {
  return `repositories/${repo}/${kind}/FILE_DOCS`;
}

/** The repository's File Docs for a kind, then the defaults; missing files are skipped. */
export function loadFileDocs(vaultDir: string, repo: string, kind: string): FileDocsSource[] {
  const repos = repo === DEFAULTS_REPO ? [repo] : [repo, DEFAULTS_REPO];
  return repos.flatMap(r => {
    const source = fileDocPath(r, kind);
    try {
      return [{ source, docs: parseFileDocs(fs.readFileSync(path.join(vaultDir, `${source}.md`), 'utf-8')) }];
    } catch {
      return [];
    }
  });
}
