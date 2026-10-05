# Commit and push galaxy-brain state

This policy applies only to tracking files, review notes, plans, debriefs, and
instructions in the **galaxy-brain repository**. It does not change how agents
commit, push, or manage code in project repositories or worktrees.

## Checkpoint regularly

- Commit and push your galaxy-brain changes after each coherent queue refresh,
  review batch, or planning/implementation milestone, and before handing work
  back to John. During long tasks, checkpoint between phases rather than leaving
  all tracking updates until the end. Batch related edits; do not commit every
  sentence or create empty commits.
- Apply [SECURITY_REPORTS.md](SECURITY_REPORTS.md) before writing or syncing notes.
  Inspect the intended diff for sensitive material before committing.
- Follow the repository's validation instructions. Keep commits focused and use
  a short message describing the tracking or documentation change.

## Preserve concurrent work

- Inspect the working tree and index first. Commit only changes you made for the
  current task, using explicit paths or hunks. Never use blanket `git add -A` or
  include someone else's staged changes. If a file contains overlapping work,
  isolate your own hunks or report the conflict; do not commit the whole file.
- Leave unrelated staged and unstaged changes intact. Do not reset, stash, clean,
  or rewrite other agents' work to make a checkpoint possible.
- When using subagents, the coordinator owns galaxy-brain commits and pushes.
  Subagents write their assigned files and report back; they do not independently
  manipulate the shared Git index or push tracking updates.

## Push safely

- Use galaxy-brain's established remote and the branch appropriate to the task;
  check the outgoing commits before pushing. Do not publish unrelated,
  unreviewed local commits merely to push your own update.
- This policy does not authorize force-pushing, opening PRs, merging, or changing
  any project's branch/worktree workflow.
- If a push is rejected, permissions are missing, or unrelated work prevents a
  safe sync, keep the local work intact and tell John what remains uncommitted or
  unpushed and why. Do not silently skip the checkpoint or rewrite history.
