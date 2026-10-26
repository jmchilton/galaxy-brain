// Branch/review record metadata (index.md frontmatter) and the record's diff base.
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import type { BaseChoice } from "../../differential-review-lib/src/cli/index.js";
import { isReviewableRecordKind, parseRecordPath, type ReviewableRecordKind } from "../../site/src/lib/records";

export interface RecordInfo {
  repo: string | null;
  kind: ReviewableRecordKind | null;
  /** Record dir name: the branch name, or the PR number for review records. */
  branch: string;
  upstreamBaseBranch: string | null;
  parentBranch: string | null;
}

export function readFrontmatter(markdown: string): Record<string, unknown> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  if (!m) return {};
  const data = parseYaml(m[1]);
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

/** Repo and kind of a `repositories/<repo>/{branches,reviews}/<status>/<name>` dir; nulls for other layouts. */
function recordLocation(abs: string): { repo: string | null; kind: ReviewableRecordKind | null } {
  const parts = abs.split(sep);
  const i = parts.lastIndexOf("repositories");
  const parsed = i >= 0 ? parseRecordPath([...parts.slice(i), "index.md"].join("/")) : null;
  if (parsed?.rest !== "index.md" || !isReviewableRecordKind(parsed.kind)) return { repo: null, kind: null };
  return { repo: parsed.repo, kind: parsed.kind };
}

/** Read a branch or review record dir; throws without index.md so a typo never creates a stray record. */
export function readRecord(recordDir: string): RecordInfo {
  const abs = resolve(recordDir);
  const indexPath = join(abs, "index.md");
  if (!existsSync(indexPath)) {
    throw new Error(
      `no record at ${abs} (no index.md); --record must be an existing vault/repositories/<repo>/{branches,reviews}/<status>/<name> dir`,
    );
  }
  let fm: Record<string, unknown>;
  try {
    fm = readFrontmatter(readFileSync(indexPath, "utf8"));
  } catch (e) {
    throw new Error(`cannot parse frontmatter in ${indexPath}: ${(e as Error).message}`);
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    ...recordLocation(abs),
    branch: basename(abs),
    upstreamBaseBranch: str(fm.upstream_base_branch),
    parentBranch: str(fm.parent_branch),
  };
}

/** `parent_branch` first (a local factory branch), else `upstream_base_branch`; `--base` overrides both. */
export function chooseBase(record: RecordInfo, override: string | undefined): BaseChoice {
  if (override) return { name: override, source: "override" };
  if (record.parentBranch) return { name: record.parentBranch, source: "parent_branch", localFirst: true };
  if (record.upstreamBaseBranch) return { name: record.upstreamBaseBranch, source: "upstream_base_branch" };
  if (record.kind === "reviews") throw new Error(`review record ${record.branch} has no base: pass --base <the PR's base branch>`);
  throw new Error(
    `record ${record.branch} has no base: add \`upstream_base_branch: <branch>\` to its index.md frontmatter ` +
      `(see vault/agents/_shared/REPOSITORY_BRANCHES.md) or pass --base <ref>`,
  );
}
