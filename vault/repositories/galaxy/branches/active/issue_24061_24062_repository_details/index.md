# issue_24061_24062_repository_details

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24061_24062_repository_details?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24061_24062_repository_details)

## Status

`branches_implemented_needs_ci`: implemented and hardened 2026-10-20, status READY. Base `dev` (`1e6125acd93`), head `dbc56f23a7a`. History rewritten by the baseline refactor; old SHAs in debriefs map via [baseline_refactor.md](baseline_refactor.md). Worktree: `~/projects/worktrees/galaxy/branch/issue_24061_24062_repository_details`.

No PR yet.

Fork CI hasn't been checked.

## About

Tool Shed repository page work for [#24061](https://github.com/galaxyproject/galaxy/issues/24061) (no hg repository link) and [#24062](https://github.com/galaxyproject/galaxy/issues/24062) (show `.shed.yml` and categories), together on one branch at John's request. Base is `dev` at John's request, and the change adds `categories` and `clone_url` to the published `DetailedRepository` schema.

[Implementation debrief](implementation_debrief.md) · [initial implementation debrief](initial_implementation_debrief.md)

Hardening: [review](subagents/normal_review.md) · [test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [thermo-nuclear review](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope evaluation](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## Notes

- Merging with [#24167](https://github.com/galaxyproject/galaxy/pull/24167) conflicts only in test files (`playwrightbrowser.py`, `test_frontend_repositories.py`, `test_repositories_manager.py`; keep both sides); regenerate `schema.ts` for whichever lands second.
- #24062's per-tool source links wait on #24167's file browser.
