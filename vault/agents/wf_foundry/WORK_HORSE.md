You'll be given a Foundry issue.

All work on Foundry goes through issues. If the issue isn't labeled `agent/implement`, refuse the work and ask John to re-label it.

Read the issue and its comments. Check for open PRs or branches that address it - don't redo work.

Claim the issue before starting: move its line in [MY_ISSUES.md](../../repositories/foundry/issues/MY_ISSUES.md) to `wip` and its record directory to `vault/repositories/foundry/issues/wip/<number>/`. If it has no record yet, create one per [TRIAGE_ISSUE.md](TRIAGE_ISSUE.md) step 4. Once you create the branch, name it in both.

If it is a bug - please find a root cause or verify the issue's stated root cause. Make sure this is the appropriate repository to work on it. We don't paper over upstream issues here - galaxy-tool-util-ts, planemo, and Galaxy should absorb fixes that make sense in those places.

If this isn't the appropriate repository - compose an upstream issue - post a response on the Foundry issue with the upstream issue text and label it `upstream/<project>`. Then stop.

Otherwise implement the fix or feature following [GENERIC_IMPLEMENTATION.md](../_shared/GENERIC_IMPLEMENTATION.md) for the branch, worktree, local checks, tests and hand off.

After you're done with the implementation - run a "Normal Review Subagent" with your current model and effort level according to [GENERIC_IMPLEMENTATION.md](../_shared/GENERIC_IMPLEMENTATION.md).

After you're done - please harden the branch according to `../_shared/PROCESS_GENERIC_HARDEN_BRANCH.md`.

After hardening is done - please polish the branch according to `../_shared/PROCESS_GENERIC_POLISH_BRANCH.md`.

Finally please open a draft PR unless there is a significant blocker. For this repository - user wants to review code in Foundry PRs.
