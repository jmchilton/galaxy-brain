
The file `PULL_REQUESTS.md` beside `AGENTS.md` is the review queue: a flat list of PR numbers under a title like `PRs To Review:`.

As Pull Requests are merged - worktrees associated with that pull request should be pruned if present (as specified in WORKTREES.md).

Never put review history, findings, CI logs, worktree inventories, follow-up branches, issues,
or completed/delivered PRs in `PULL_REQUESTS.md`. Those details belong in the active review note or nowhere.
