## Worktree lifecycle

Follow the shared [worktree lifecycle](../_shared/WORKTREES.md), with PROJECT set to `galaxy`.

**Exception — Playwright/Selenium E2E work.** The `playwright` project keeps one
long-lived worktree and switches branches inside it, rather than one per branch.
Per-branch worktrees do not pay off here: each needs its own venv, Playwright
browsers and pnpm client install, and only one worktree can hold port 8080
(Galaxy) and 5173 (Vite) anyway, so they cannot run E2E suites in parallel. The
branches are also typically a few lines. Review worktrees created by `ghwt` for
open PRs are unaffected.

## Branch Tracking

The galaxy-brain keeps track of branches under development and a separate agent from the implementation agent is responsible for tracking CI, opening PRs, pulling PRs out of draft etc... If you're not an agent in the working directory of this PROJECT_MANAGEMENT note - that probably means you shouldn't be opening PRs. When you're done with your implementation - please read vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md for a description of how to hand the work off for the branch management agents to polish, track, and open a PR for.

Branch records and supporting files live under `vault/repositories/galaxy/branches/active/<branch_name>/`, following [REPOSITORY_BRANCHES.md](../_shared/REPOSITORY_BRANCHES.md). The queue links to each branch's `index.md`; implementation and workflow-status changes keep the same directory.
