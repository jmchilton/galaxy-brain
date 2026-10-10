# Readability batch 40

Four originators drawn with seed `2610940`, one test per commit, then one range review. The review asked for a shared helper, which the driver added before the commit that uses it. [Manifest](readability_batch_40.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| Grid `adminUsers` | Nested a/b/c loops became `describe.each`/`it.each` truth tables with each expected value written out; every original input combination is its own row. `operation(title)` looks operations up by title. The field count and 11 `toContain` title checks became exact ordered lists. [Review](reviews/batch40/adminUsers.md). | 1 → 46 |
| DetailsLayout | `mountDetailsLayout({ props, user })` with `withPlugins`, `SELECTORS`, `openEditor()` and `enableAutoUnmount`; still a full mount. The user is still set after mount, now with an explicit `nextTick`. Fake users replace `{id, email}` and `{}`, on the same side of `"email" in user`. "Log in" and "Not Editable" are exact, and each permission case checks the toggle's `aria-disabled`. [Review](reviews/batch40/DetailsLayout.md). | 6 → 6 |
| Tool Shed ForgotPassword | Installs the existing `createMemoryRouter()`, removing two `router-link` warnings. `SELECTORS`, `submit()`, `enableAutoUnmount`. Success and failure each check what disappears. New case: the link back to login. [Review](reviews/batch40/ForgotPassword.md). | 2 → 3 |
| `historyStore.lists` | `setupTestPinia()`, `deferred` in place of no-op resolver placeholders, an `ids()` helper, and `toMatchObject` in place of an `owner` cast. The dedupe check now asserts the same array is returned (`toBe`), not just an equal one. [Review](reviews/batch40/historyStore.lists.md). | 16 → 16 |

## Reuse and follow-through

New shared helper, added by the driver at review's request: `deferred<T>()` in `client/tests/vitest/deferred.ts` (`1187b4bd574`). Four identical copies became one import: GalaxyAI's exported `deferredResponse` (newchat and routesync tests), `workflowStore.test.ts`, `CuratedWorkflowList.test.ts` and historyStore.lists. Batch 10 rejected a shared one when nothing repeated. [Note](reviews/batch40/deferred.md). Follow-up: `pageStore.test.ts` and `visualizationStore.test.ts` keep hand-rolled resolvers; adopting `deferred` there belongs in their own passes.

Guidance: none.

## Validation and review

123 cases across 8 suites pass; the originators' baseline was 25. Each commit's tests pass at that commit, shuffled with seed `400101`; full client vue-tsc and the Tool Shed typecheck pass at the tip; ESLint, Prettier and hooks pass. Per-test coverage at the batch base and the tip: no source file lost covered lines or branches (819 compared; test helpers excluded, as in `case_metrics.py`). The [independent review](reviews/batch40/review.md) approved three commits and asked for the shared `deferred` helper.

Commits: `fcdf6126bc5` (adminUsers), `cb5974b342e` (DetailsLayout), `ccf0ae09d44` (ForgotPassword), `1187b4bd574` (deferred), `150fd592d42` (historyStore.lists).
