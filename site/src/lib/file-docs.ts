import { DEFAULTS_REPO } from './records';

// File Docs describe the files inside repository records. Each
// `repositories/<repo>/<kind>/FILE_DOCS.md` (and the `_defaults` repository's,
// as fallback) is a `# ` title followed by one `## <glob>` section per file
// pattern, relative to the record directory. See LIBRARY_RECORD_FILE_DOCS.md.
// No Node imports: the plugins bundle this too.

export { DEFAULTS_REPO } from './records';

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
    const h1: RegExpMatchArray | null | false = !inFence && !current && title === null && line.match(/^#\s+(.+?)\s*$/);
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

/** `source` paths for a kind, in resolution order: the repository's, then the defaults. */
export function fileDocSources(repo: string, kind: string): string[] {
  return (repo === DEFAULTS_REPO ? [repo] : [repo, DEFAULTS_REPO]).map(r => fileDocPath(r, kind));
}

export interface RecordFileLink {
  /** Record-relative; a folder's ends in `/`. */
  path: string;
  /** Record-relative files under a folder. */
  files?: string[];
  /** First sentence of its File Docs section; absent when undocumented. */
  hint?: string;
}

export interface RecordFileLinks {
  /** In File Docs section order. */
  documented: RecordFileLink[];
  other: RecordFileLink[];
}

/** A record's files as links for its landing page: `index.md` left out, folders collapsed to one link. */
export function recordFileLinks(files: string[], sources: FileDocsSource[]): RecordFileLinks {
  const sections = sources.flatMap(({ docs }) => docs.sections);
  const links = new Map<string, RecordFileLink>();
  for (const file of [...files].sort()) {
    if (file === 'index.md') continue;
    const slash = file.indexOf('/');
    if (slash < 0) {
      links.set(file, { path: file });
    } else {
      const path = file.slice(0, slash + 1);
      const folder = links.get(path) ?? { path, files: [] };
      folder.files!.push(file);
      links.set(path, folder);
    }
  }
  const documented: { link: RecordFileLink; order: number }[] = [];
  const other: RecordFileLink[] = [];
  for (const link of links.values()) {
    const doc = [link.path, ...(link.files ?? [])].map(rel => resolveFileDoc(sources, rel)).find(Boolean);
    if (doc) documented.push({ link: { ...link, hint: fileDocSummary(doc.section.body) }, order: sections.indexOf(doc.section) });
    else other.push(link);
  }
  return { documented: documented.sort((a, b) => a.order - b.order).map(({ link }) => link), other };
}

export function recordFileLabel({ path, files }: RecordFileLink): string {
  return files ? `${path} (${files.length})` : path.replace(/\.md$/, '');
}
