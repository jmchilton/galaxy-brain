import fs from 'node:fs';
import path from 'node:path';
import { type FileDocsSource, fileDocSources, parseFileDocs } from './file-docs';

/** The repository's File Docs for a kind, then the defaults; missing files are skipped. */
export function loadFileDocs(vaultDir: string, repo: string, kind: string): FileDocsSource[] {
  return fileDocSources(repo, kind).flatMap(source => {
    try {
      return [{ source, docs: parseFileDocs(fs.readFileSync(path.join(vaultDir, `${source}.md`), 'utf-8')) }];
    } catch {
      return [];
    }
  });
}
