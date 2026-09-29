
The file `PULL_REQUESTS.md` beside `AGENTS.md` is the review queue: a flat list of PR numbers under a title like `PRs To Review:`.

As Pull Requests are merged - worktrees associated with that pull request should be pruned if present (as specified in WORKTREES.md).

A PR stays in `PULL_REQUESTS.md` until it is merged or closed, or the user removes it. Delivering
or approving a review is *not* a reason to remove it - the user often still has to merge it. Update
its status line instead (e.g. `approved; awaiting merge`).

Never put review history, findings, CI logs, worktree inventories, follow-up branches, or issues
in `PULL_REQUESTS.md`. Those details belong in the active review note or nowhere.
