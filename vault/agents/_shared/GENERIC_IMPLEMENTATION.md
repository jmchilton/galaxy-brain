## Project Settings

The including agent's `AGENTS.md` has a "Project settings" block: PROJECT, base branch, push remote, branch naming, local gate, and when CI runs. Values here in capitals come from it.

## Branch and Worktree

BRANCH_DIRECTORY is `vault/repositories/PROJECT/branches/active/<branch_name>/`; follow [REPOSITORY_BRANCHES.md](REPOSITORY_BRANCHES.md) for its record and supporting files. WORKING_DIRECTORY is the worktree, created per [WORKTREES.md](WORKTREES.md).

Name the branch per the settings. Fetch the base before branching and branch from the fetched remote ref - `ghwt` can branch off a stale base. Record the base and its SHA in the branch record. Push to the settings' push remote.

## Local Checks

Read the worktree's `AGENTS.md`/`CLAUDE.md`/`AI_POLICY.md` before changing code; this agent starts outside the repository, so they aren't loaded for you. Run the settings' local gate before handing off, and note in the branch record any check that fails for reasons outside the branch.

## Tests

Work red to green: write a test that fails on the base for the reported reason, then fix it.

## Review Debriefs

A review debrief has a top-line written by you describing what you acted on and didn't. Follow it with a quick list of things you didn't act on and why. Place the full review under a `details` section. If the review identifies any security issues at all - please skip this document and write out a security report for me according to `SECURITY_REPORTS.md`.

## Normal Review Subagent

When any part of this work asks for a normal subagent review. The subagent should be given ``vault/agents/_shared/REVIEW_FOCUS.md`` for suggested focus areas but domain/branch specific concerns should also be reviewed. Do not report back to user unless a serious problem arises or until after the review has been done and acted on.

Write a review debrief to `BRANCH_DIRECTORY/subagents/`.

## Hand Off

When the unit of work is done, write `BRANCH_DIRECTORY/implementation_debrief.md` and add one line to this agent's `MY_BRANCHES.md` per [MY_BRANCHES_INDEX.md](MY_BRANCHES_INDEX.md):

- `branches_implemented` if it's mostly shippable and CI is green - or, when the project's CI runs only on PRs, the local gate is.
- `branches_implemented_needs_ci` if it's shippable but CI hasn't run.
- `branches_need_decision` if development unveiled design issues or the work should be abandoned, with the suggested action.
