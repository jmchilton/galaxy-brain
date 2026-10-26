## Galaxy Project, Branch, and Worktree Management

Please read "vault/agents/gx_branches/PROJECT_MANAGEMENT.md" for information on branch and PR management for work done on this project.

BRANCH_DIRECTORY is `vault/repositories/galaxy/branches/active/<branch_name>/`; follow `vault/agents/_shared/REPOSITORY_BRANCHES.md` for its record and supporting files. WORKING_DIRECTORY is the path to the worktree/branch we're working out of.

Before branching, pick the upstream target and record it as `upstream_base_branch` in the new branch record's frontmatter. For dependent work, also set `parent_branch` to the parent's branch name within this project and branch from it, per `REPOSITORY_BRANCHES.md`. The Galaxy policy is the oldest supported branch that has the bug (1 year since release) - the user's preference is that more intricate fixes push us toward targeting a more recent release and more serious issues or simpler/cleaner fixes push us toward targeting an older release. Generally fixes shouldn't target dev - but if the bug fix requires a serious API change or a database migration - dev may be the appropriate target.
## Alt Branches

An alt branch keeps an alternative take on a branch - e.g. its original scope after a re-scope, or a competing approach - and is named `<branch_name>_alt_<short_description>`. Describe each alt in `BRANCH_DIRECTORY/alts/<short_description>.md`: what it does and how it differs from the parent. Alts don't get their own worktrees, workspaces, or branch directories, and aren't tracked in `MY_BRANCHES.md` - the parent's branch directory tracks them. Pushing the alt to the user's remote is sufficient.
## Unused Infrastructure

When new or ported infrastructure has no caller, search the existing codebase for a real consumer it would improve before offering to park, fold or delete it. Report the sites it doesn't help, and why.
## Running Python

Use the worktree's `.venv` (no `.venv` → `/galaxy-bootstrap`):

- Tests: `source .venv/bin/activate && PYTHONPATH=lib pytest <path>`; API/integration/Selenium via `/galaxy-backend-tests` or `/galaxy-playwright`.
- Scripts: write them to the scratchpad, run with `.venv/bin/python <script>`. Not bare `python3`, and not `uv run python -` heredocs.
- JSON from `curl`: `jq`, not `python3 -c`.
- ruff, black, isort and mypy come from `.venv/bin` at CI's pins; not `uvx`. If one is missing, install `lib/galaxy/dependencies/pinned-{lint,typecheck}-requirements.txt` into `.venv` rather than reaching for another copy.
- Quick mypy: `.venv/bin/mypy <changed files>` from the worktree root (`cd lib` first pulls in unrelated errors). Judge `make mypy` against the base branch, not by raw count.
## Local Checks

Run client vitest under the node pinned in `client/.node_version` (`npm_config_use_node_version=<version> pnpm exec vitest run <path>`); the default node 25 breaks happy-dom's `localStorage` on unmodified `dev`.
## Issues

If you're asked by the user to file an issue or record an issue or file a bug report or record a feature request, etc... - do not do this directly. Follow the process in ``vault/agents/_shared/GX_QUEUING_ISSUE_CREATION.md``.
## Review Debriefs

A review debrief has a top-line written by you describing what you acted on and didn't. Follow it with a quick list of things you didn't act on and why. Place the full review under a `details` section. If the review identifies any security issues at all - please skip this document and write out a security report for me according to `SECURITY_REPORTS.md`.
## Normal Review Subagent

When any part of this work asks for a normal subagent review. The subagent should be given ``vault/agents/_shared/REVIEW_FOCUS.md`` for suggested focus areas but domain/branch specific concerns should also be reviewed. Point it at `BRANCH_DIRECTORY/brain_research.md`, if present, as optional reading. Do not report back to user unless a serious problem arises or until after the review has been done and acted on.

Write a review debrief to `BRANCH_DIRECTORY/subagents/`.
## Hand Off

`vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md` describes how to hand off to Galaxy's branch management agent. Please do not open a PR.
