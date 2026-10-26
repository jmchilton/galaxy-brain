No refactoring of the base branch was performed.

Reviewed the complete diff and both commits. The branch already separates behavior-preserving test scaffolding and baseline coverage from the fix:

- `0e56f4e9a3a` adds stable form hooks, navigation targets, the reset-request helper, and two baseline form tests. Those tests passed against the original client before the behavior change.
- `b88e76ad2ca` introduces the password-save reload and corrected expired-login destination, removes the now-unused router dependency, and extends the browser coverage through the real save/session flows.

There is no independent implementation refactor to move ahead of the fix. Removing the router dependency depends directly on replacing router navigation; the new save helpers serve the regression extensions and do not restructure existing behavior. Introducing another precursor commit would split small, cohesive changes without creating a separately useful cleanup.

Both commits and their order are preserved. No history mutation, working-tree edit, or force push was performed. The worktree is clean, and `git diff --check origin/release_25.1` passed. Existing successful test evidence remains applicable because this evaluation changed no code.
