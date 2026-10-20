# issue_22598_login_prompt_26.2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_22598_login_prompt_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_22598_login_prompt_26.2)

## Status

`branches_implemented_needs_ci`: implemented and pushed 2026-10-20, but not polished. Base `release_26.2` (`1ff2ce4cc51`), head `afa049f39cf`. Worktree: `~/projects/worktrees/galaxy/branch/issue_22598_login_prompt_26.2`.

No PR yet.

Fork CI hasn't been checked.

## About

This is the 26.2 stopgap for [#22598](https://github.com/galaxyproject/galaxy/issues/22598), which mvdbeek suggested on [#24167](https://github.com/galaxyproject/galaxy/pull/24167). John asked for it on 2026-10-20, after retargeting #24167 (the anonymous contents browser) to `dev`.
- Anonymous users now see "Log in to view changelog" and "Log in to browse contents" in place of links to hgweb's bare "Forbidden".
- `/login?redirect=<path>` returns the user to that path after login. Only paths on the same site are accepted (`safeReturnPath`).

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md)

## Verification

Shed frontend: vitest 185/185, plus vue-tsc, prettier and eslint (0 errors). Every new test was seen failing first, including the auth-store test run against the original store. No Playwright test was added or run. The post-login hop to hgweb on the main shed depends on nginx accepting the new session cookie, which can't be checked locally.

## Notes

- The merge forward to `dev` conflicts with #24167's `RepositoryExplore.vue`. Dev should keep #24167's in-app Contents and logged-in-only Changelog. The login return path in `LoginForm`, `LoginPage`, `auth.store` and `routes` could carry forward, so that dev's anonymous Changelog becomes a login prompt too.
- `PaginatedRepositoriesGrid.test.ts` gets the same pinia and `RouterLinkStub` setup as #24167, to keep that conflict trivial.
- The auth store's `returnUrl` state is unused and was left untouched.
