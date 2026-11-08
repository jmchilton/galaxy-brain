// Refusals that need git: the review branch on John's fork must be exactly what the findings YAML lists.
import { revParse, tryGit } from "../../differential-review-lib/src/cli/git.js";
import { fetched, fetchedFromFork } from "../../differential-review/src/capture";
import type { ComposeContext, GateResult } from "./gates";
import { latestBranch } from "./model";

const short = (sha: string): string => sha.slice(0, 11);

/** Fetches the review branch and the PR head into `worktree`, then compares them with the manifest. */
export function branchGates(ctx: ComposeContext, worktree: string): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { file } = ctx;
  const reviewed = revParse(worktree, file.reviewed_commit);
  if (!reviewed) return { errors: [`reviewed commit ${short(file.reviewed_commit)} isn't in ${worktree}`], warnings };
  const prHead = fetched(worktree, "origin", `pull/${ctx.pr}/head`);
  if (!prHead) warnings.push(`couldn't fetch PR #${ctx.pr} from origin`);
  else if (prHead !== reviewed) warnings.push(`PR #${ctx.pr} has moved to ${short(prHead)} since the reviewed commit ${short(reviewed)}`);
  const branch = latestBranch(file);
  if (!branch?.commits.length) return { errors, warnings };
  const forkHead = fetchedFromFork(worktree, branch.name);
  if (!forkHead) return { errors: [`${branch.name} isn't on John's fork; push it first`], warnings };
  const listedHead = revParse(worktree, branch.head);
  if (forkHead !== listedHead) errors.push(`${branch.name} is at ${short(forkHead)} on the fork, but the findings YAML says ${branch.head}`);
  const actual = (tryGit(worktree, ["rev-list", "--reverse", `${reviewed}..${forkHead}`]) ?? "").split("\n").filter(Boolean);
  const listed = branch.commits.map((c) => revParse(worktree, c.sha) ?? c.sha);
  if (actual.join() !== listed.join()) {
    errors.push(`${branch.name} has commits ${actual.map(short).join(", ") || "none"} on the reviewed commit, but the findings YAML lists ${branch.commits.map((c) => c.sha).join(", ")}`);
  }
  if (file.actions.push && prHead && tryGit(worktree, ["merge-base", "--is-ancestor", prHead, forkHead]) === null) {
    errors.push(`pushing ${branch.name} onto PR #${ctx.pr} wouldn't fast-forward from ${short(prHead)}`);
  }
  return { errors, warnings };
}
