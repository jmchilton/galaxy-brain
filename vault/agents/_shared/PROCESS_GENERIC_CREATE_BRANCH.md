You'll be given an issue on `<repo>`, the repository your agent directory works on.

Read the issue and its comments. Check for open PRs or branches that address it - don't redo work.

Claim the issue before starting: move its line in your agent directory's `ISSUES.md` to `wip` and its record directory to `vault/repositories/<repo>/issues/wip/<number>/`. If it has no issue record yet, create one.

If it is a bug - please find a root cause or verify the issue's stated root cause. Make sure this is the appropriate repository to work on it.

If this isn't the appropriate repository - compose an upstream issue - post a response on the `<repo>` issue with the upstream issue text. Then stop and report to user.

Otherwise implement the fix or feature following [GENERIC_IMPLEMENTATION.md](../_shared/GENERIC_IMPLEMENTATION.md) for the branch, worktree, local checks, tests and hand off.

After you're done with the implementation - run a "Normal Review Subagent" with your current model and effort level according to [GENERIC_IMPLEMENTATION.md](../_shared/GENERIC_IMPLEMENTATION.md).

After you're done - please harden the branch according to `../_shared/PROCESS_GENERIC_HARDEN_BRANCH.md`.

After hardening is done - please polish the branch according to `../_shared/PROCESS_GENERIC_POLISH_BRANCH.md`.
