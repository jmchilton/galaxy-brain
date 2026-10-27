Moved the RepositoryExplore hgweb-link consolidation (one `hgwebLinks` model rendered via `v-for`) onto the base as a behavior-preserving first commit; the login-prompt fix now only adds the anonymous branch to that model.

- New first commit `7f89007bf1c` "Render shed hgweb explore links from one model": on `release_26.2` behavior, Changelog/Contents in both the dropdown and dense button group render from a computed list of `{key, icon, label, target: {href}}`. No auth logic. Existing `RepositoryMenus`/`PaginatedRepositoriesGrid` tests pass unchanged; vue-tsc clean.
- `017c42927f1` (was `afa049f39cf`) "Prompt anonymous users to log in..." now lands directly in the final model form: the map picks `{href}` for logged-in users or `{to: /login?redirect=...}` plus "Log in to ..." label otherwise. Its tests are unchanged.
- Dropped `19f5b1054f6` (the post-hoc collapse of duplicated `v-if`/`v-else` templates); its content is split between the two commits above.
- Other commits replayed unchanged. Kept the original merge-base `1ff2ce4cc51` (no rebase). Final tree is byte-identical to the old head `19f5b1054f6`; new head `64f0b66df55`. Old head saved as local branch `backup/issue_22598_pre_baseline`. Not pushed.
- Verified: vitest 186/186, vue-tsc, eslint, prettier at head; vitest + vue-tsc at the refactor commit. E2E not rerun (final tree identical).
