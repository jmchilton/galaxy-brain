We've got an impossible job - make CWL work in Galaxy.
## Worktree lifecycle

Worktrees live at `~/projects/worktrees/galaxy/branch/<BRANCH_NAME>/`, managed by `ghwt`.

**Add** — driven by the document. A PR number that appears in `index.md` with no
corresponding worktree gets one:

```sh
ghwt create galaxy <BRANCH_NAME>
```

**Remove** — driven by PR state, *not* by the document. When a PR has been merged or
closed for a few days, tear its worktree down - warn user if files need to be cleaned up first:

```sh
ghwt rm galaxy <BRANCH_NAME>
```

The asymmetry is intentional. Removing a number from `index.md` does **not** mean
destroy the worktree — reviewing may still be in flight, or the note may have been pruned
for tidiness. Only a merged/closed PR that has settled for a few days justifies removal.
Conversely, a still-open PR keeps its worktree even after it drops off the list.
