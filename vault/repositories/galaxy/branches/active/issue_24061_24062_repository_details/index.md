# issue_24061_24062_repository_details

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24061_24062_repository_details?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24061_24062_repository_details)

## Status

Implemented and pushed 2026-10-20; hardening in progress (baseline refactor next). Base `dev` (`1e6125acd93`), head `5b696c92143`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24061_24062_repository_details`.

No PR yet.

Fork CI hasn't been checked.

## About

Tool Shed repository page work for [#24061](https://github.com/galaxyproject/galaxy/issues/24061) (no hg repository link) and [#24062](https://github.com/galaxyproject/galaxy/issues/24062) (show `.shed.yml` and categories), together on one branch at John's request. Base is `dev` at John's request, and the change adds `categories` and `clone_url` to the published `DetailedRepository` schema.

[Initial implementation debrief](initial_implementation_debrief.md)

Hardening: [review](subagents/normal_review.md) · [test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [thermo-nuclear review](thermo_nuclear_review.md)

## Notes

- Conflicts expected with [#24167](https://github.com/galaxyproject/galaxy/pull/24167) in `RepositoryPage.test.ts` (fixture and appended test) only; `RepositoryExplore.vue` is untouched.
