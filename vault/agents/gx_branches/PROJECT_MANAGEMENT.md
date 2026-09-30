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

The galaxy-brain keeps track of branches under development and a separate agent from the implementation agent is responsible for tracking CI, opening PRs, pulling PRs out of draft etc... If you're not an agent in the working directory of this PROJECT_MANAGEMENT note - that probably means you shouldn't be opening PRs. When you're done with your implementation - please read MY_BRANCHES.md relative this PROJECT_MANAGEMENT file and place your branch in the appropriate section (sections have obvious names). If you're a codex agent please drop a PR description for the branch in this directory at the same time - Claude please wait for the branch management agent to do this. While agents outside of this directory should not open PR - they should also probably be committing work and pushing to the jmchilton remote unless prompted not to - John prefers to review Galaxy work on the Github interface.
