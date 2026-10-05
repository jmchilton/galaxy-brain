# Sync galaxy-brain

Commit and push tracking files, notes, plans, and debriefs after meaningful batches
of updates and before handoff. Checkpoint between phases during long tasks.
This applies only to galaxy-brain, not project code or worktree workflows.
Use `main` and the established remote; don't create side branches for these
updates unless John asks.

- Commit only your own changes; preserve others' staged and unstaged work.
  The coordinator handles Git when using subagents.
- Validate and inspect the diff and outgoing commits. Don't publish unrelated,
  unreviewed work or force-push. If blocked, tell John what remains unsynced and why.
- Keep sensitive findings out of the repo per
  [SECURITY_REPORTS.md](SECURITY_REPORTS.md).
