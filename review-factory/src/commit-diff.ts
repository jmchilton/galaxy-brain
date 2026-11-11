// A review-branch commit's diff for the landing page. Never fetches: a host call has about 500 ms.
import { diff, revParse } from "../../differential-review-lib/src/cli/git.js";
import { parseDiff } from "../../differential-review-lib/src/core/diff.js";
import { recordCheckout } from "./branch-gates";
import type { CommitDiff } from "./landing";

export function commitDiff(worktree: string, sha: string): CommitDiff {
  const full = revParse(worktree, `${sha}^{commit}`);
  if (!full) return { missing: `${sha} isn't in ${worktree}; fetch the review branch there` };
  return {
    files: parseDiff(diff(worktree, `${full}^`, full)).map((file) => ({
      path: file.path,
      patch: file.text,
      added: file.hunks.reduce((n, h) => n + h.added, 0),
      removed: file.hunks.reduce((n, h) => n + h.removed, 0),
    })),
  };
}

/** commitDiff in the record's PR checkout. */
export const recordCommitDiff = (dir: string, sha: string): CommitDiff => commitDiff(recordCheckout(dir), sha);
