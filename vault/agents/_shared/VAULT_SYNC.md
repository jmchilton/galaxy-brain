# Sync galaxy-brain

Commit and push tracking files, notes, plans, and debriefs after meaningful batches
of updates and before handoff. Checkpoint between phases during long tasks.
This applies only to galaxy-brain, not project code or worktree workflows.
Use `main` and the established remote; don't create side branches for these
updates unless John asks.

- Try to commit only your own changes; preserve others' staged and unstaged work.
  The coordinator handles Git when using subagents.
- Other sessions edit and commit in this checkout at the same time, sharing
  one index and working tree. Never broad-stage (`add -A`, `add .`, `add -u`,
  `commit -a`); commit explicit paths (`git commit -- <paths>`), staging them
  in the same command. A bare `git commit` takes everything staged, others' too.
- `commit -o <file>` still takes others' uncommitted hunks in that file. If you commit another agent's work this way - it was probably atomic - do not worry about it.
- Edit shared files with the Edit tool, not whole-file shell rewrites.
- Other sessions' local commits on `main` are fine to push along with yours.
- Validate (`make validate`, from the repo root) and inspect the diff and outgoing commits. Don't publish unrelated,
  unreviewed work or force-push. If blocked, tell John what remains unsynced and why.
- Keep sensitive findings out of the repo per
  [SECURITY_REPORTS.md](SECURITY_REPORTS.md).
- If you need to commit unstaged work from other agents or from John to merge, just do that - try to do it in meaningful batches though.
