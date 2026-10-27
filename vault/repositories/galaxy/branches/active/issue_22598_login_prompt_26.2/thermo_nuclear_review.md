# Thermo-nuclear review — issue_22598_login_prompt_26.2

Reviewed `origin/release_26.2...f07f5e8721a`; fix commit `19f5b1054f6`.

## Verdict
Mostly clean, small bugfix. One structural problem: duplicated markup in `RepositoryExplore.vue`. Fixed.

## Findings
1. **Fixed: `RepositoryExplore.vue` duplicated branches.** Four `v-if="authStore.user"` / `v-else` template copies (menu + dense, changelog + contents) differed only in label and `href` vs `to`. Replaced them with one computed `hgwebLinks` model (`{key, icon, label, target}`), rendered with `v-for` + `v-bind="link.target"`. The file is 51 lines smaller (−51/+30), and the auth branch is now a single ternary.
2. **Kept: `safeReturnPath` in `util.ts`.** It's in the right layer, short, resolves URLs against the page's origin and is tested. No canonical helper exists in the shed frontend.
3. **Kept: `returnTo` threaded route → LoginPage → LoginForm → `authStore.login`.** It's explicit and typed. The pre-existing unused `returnUrl: null` store state could have carried it, but that would be hidden global state. Not touched on a release branch.
4. **Noted: `setup()` catch now clears the cached user on any error**, network errors included. It's acceptable: being shown as logged out gives a login prompt, not a broken link. This is a behavior choice, not a structure issue.
5. **Noted: the global `config.global.stubs` mutation in `PaginatedRepositoriesGrid.test.ts`** is module-level and leaks across the file. That's fine for vitest per-file isolation.

No file crosses 1k lines. There are no casts or `any` added.

## Verification
- vitest: 28 files, 186 tests pass. Existing tests cover both auth states' labels and links, so the refactor was checked without new tests.
- vue-tsc, eslint and prettier are clean.
- E2E was not touched, so it wasn't rerun.
