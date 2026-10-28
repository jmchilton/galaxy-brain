---
upstream_base_branch: release_26.2
pr: 24549
---

# issue_22598_login_prompt_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_22598_login_prompt_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_22598_login_prompt_26.2)

## Status

Polished 2026-10-28 with scope B (John’s choice), approved at `3a3d5771d30` by launching the PR open. Base `release_26.2` (`0902830bfa6`). Worktree: `~/projects/worktrees/galaxy/branch/issue_22598_login_prompt_26.2`.

[#24549](https://github.com/galaxyproject/galaxy/pull/24549) opened as draft 2026-10-28 (CI not finished).

Fork CI on `3a3d5771d30`: most green; Playwright, Integration Selenium, first startup, tool form harness, OpenAPI lint and DB indexes queued; "Test Galaxy release script" red, not yet diagnosed.

## Hardening

Done: [test challenges](test_challenges_debrief.md), [E2E polish](polish_e2e_tests_debrief.md), [Codex review](codex_review.md), [thermo-nuclear review](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md), [scope evaluation](scope_evaluation.md). Polish: [debrief](polish_debrief.md), [checklist](pr_checklist.md).

## About

This is the 26.2 stopgap for [#22598](https://github.com/galaxyproject/galaxy/issues/22598), which mvdbeek suggested on [#24167](https://github.com/galaxyproject/galaxy/pull/24167). John asked for it on 2026-10-20, after retargeting #24167 (the anonymous contents browser) to `dev`.
- Anonymous users now see "Log in to view changelog" and "Log in to browse contents" in place of links to hgweb's bare "Forbidden".
- `/login?redirect=<path>` returns the user to that path after login. `safeReturnPath` accepts only paths that resolve to the shed's own origin. A prefix check let `/\t/evil.example` through, caught in review; `d5723a26b94` fixes it, red first.

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md)

## Verification

Shed frontend: vitest 185/185, plus vue-tsc, prettier and eslint (0 errors). Every new test was seen failing first, including the auth-store test run against the original store. No Playwright test was added or run. Nothing yet covers `routes.ts` passing `?redirect` through `LoginPage` to `LoginForm`. Polish should add a Playwright test for it: anonymous user, click the prompt, log in, land on the hgweb URL. The test shed doesn't gate hgweb. The post-login hop to hgweb on the main shed depends on nginx accepting the new session cookie, which can't be checked locally.

## Notes

- The merge forward to `dev` conflicts with #24167's `RepositoryExplore.vue`. Dev should keep #24167's in-app Contents and logged-in-only Changelog. The login return path in `LoginForm`, `LoginPage`, `auth.store` and `routes` could carry forward, so that dev's anonymous Changelog becomes a login prompt too.
- `PaginatedRepositoriesGrid.test.ts` gets the same pinia and `RouterLinkStub` setup as #24167, to keep that conflict trivial.
