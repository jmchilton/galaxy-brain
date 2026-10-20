# issue_24061_24062_repository_details

- [#24298](https://github.com/galaxyproject/galaxy/pull/24298)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24061_24062_repository_details)

## Status

`ci_wait`: draft PR opened 2026-10-20 at John's request. Base `dev` (`1e6125acd93`), head `418a861ca0d`. History rewritten by the baseline refactor; old SHAs in debriefs map via [baseline_refactor.md](baseline_refactor.md). Worktree: `~/projects/worktrees/galaxy/branch/issue_24061_24062_repository_details`.

Draft [#24298](https://github.com/galaxyproject/galaxy/pull/24298), title is the first option in `pr_titles.md`, labels from `pr_tags.md`; screenshots hosted on `pr-assets-issue_24061_24062_repository_details`.

Fork CI at head is queued with no reds; Tool Shed frontend evidence is the `1bc094fd6e6` run (identical frontend tree), also queued.

## About

Tool Shed repository page work for [#24061](https://github.com/galaxyproject/galaxy/issues/24061) (no hg repository link) and [#24062](https://github.com/galaxyproject/galaxy/issues/24062) (show `.shed.yml` and categories), together on one branch at John's request. Base is `dev` at John's request, and the change adds `categories` and `clone_url` to the published `DetailedRepository` schema.

[Implementation debrief](implementation_debrief.md) · [initial implementation debrief](initial_implementation_debrief.md)

PR: [description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

Hardening: [review](subagents/normal_review.md) · [test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [thermo-nuclear review](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope evaluation](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

## Notes

- Merging with [#24167](https://github.com/galaxyproject/galaxy/pull/24167) conflicts only in test files (`playwrightbrowser.py`, `test_frontend_repositories.py`, `test_repositories_manager.py`; keep both sides); regenerate `schema.ts` for whichever lands second.
- #24062's per-tool source links wait on #24167's file browser.
