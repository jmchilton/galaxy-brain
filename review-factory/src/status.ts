// What a trim must change on the review branch to match the include toggles. No Node imports.
import { type FindingsFile, latestBranch } from "./model";

export interface TrimWork {
  /** Latest-revision commits whose findings are all excluded. */
  drop: Array<{ sha: string; findings: string[] }>;
  /** Earlier-revision commits for included findings the latest revision lacks. */
  restore: Array<{ sha: string; revision: number; findings: string[] }>;
  /** Commits shared by included and excluded findings. */
  ask: Array<{ sha: string; included: string[]; excluded: string[] }>;
}

export function trimWork(file: FindingsFile): TrimWork {
  const work: TrimWork = { drop: [], restore: [], ask: [] };
  const latest = latestBranch(file);
  if (!latest) return work;
  const included = new Set(file.findings.filter((f) => f.include).map((f) => f.id));
  const sort = (commit: { sha: string; findings: string[] }) => {
    const keep = commit.findings.filter((id) => included.has(id));
    const drop = commit.findings.filter((id) => !included.has(id));
    return { keep, drop };
  };
  const onLatest = new Set<string>();
  for (const commit of latest.commits) {
    const { keep, drop } = sort(commit);
    keep.forEach((id) => onLatest.add(id));
    if (!keep.length) work.drop.push({ sha: commit.sha, findings: drop });
    else if (drop.length) work.ask.push({ sha: commit.sha, included: keep, excluded: drop });
  }
  const restored = new Set<string>();
  for (const branch of file.branches.slice(0, -1).reverse()) {
    for (const commit of branch.commits) {
      const missing = commit.findings.filter((id) => included.has(id) && !onLatest.has(id) && !restored.has(id));
      if (!missing.length) continue;
      missing.forEach((id) => restored.add(id));
      const { drop } = sort(commit);
      if (drop.length) work.ask.push({ sha: commit.sha, included: missing, excluded: drop });
      else work.restore.push({ sha: commit.sha, revision: branch.revision, findings: missing });
    }
  }
  return work;
}

/** One line for the landing page, or null when the branch already matches. */
export function trimLine(file: FindingsFile): string | null {
  const { drop, restore, ask } = trimWork(file);
  const parts = [
    ...drop.map((c) => `drop ${c.sha} (${c.findings.join(", ")})`),
    ...restore.map((c) => `restore ${c.sha} (${c.findings.join(", ")})`),
    ...ask.map((c) => `ask John about ${c.sha} (keeps ${c.included.join(", ")}, drops ${c.excluded.join(", ")})`),
  ];
  return parts.length ? `✂️ Trim: ${parts.join(", ")}` : null;
}
