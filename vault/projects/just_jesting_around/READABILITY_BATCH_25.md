# Readability batch 25

Four originators drawn with seed `2610925` from 218 eligible entries; one test per commit, then one range review. [Manifest](readability_batch_25.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| GButton | All mounts go through `mountGButton(props, router?)`, describes regroup by behavior, and the three click-once cases become one `it.each`. Casts removed. Stronger: fallback title also checks `data-title`, and no-navigation asserts the literal URL. [Review](reviews/batch25/GButton.md). | 23 → 23 |
| Workflow Editor `collectionTypeDescription` | `it.each` rows; each "not vice versa" or symmetric pair is one row checking both directions. All 31 original assertions are kept. [Review](reviews/batch25/collectionTypeDescription.md). | 9 → 18 |
| ConfigurationMarkdown | Local mount helper replaces the shared wrapper and two mount styles; sanitizer reset moves to `beforeEach`. The non-admin case now asserts the exact text, closing an empty-render gap. [Review](reviews/batch25/ConfigurationMarkdown.md). | 4 → 4 |
| StoredWorkflowProvider | The handler returned `[]` on mismatched params and the test only checked that the callback ran, so it couldn't fail. It now asserts the exact query, items, callback count, data and `total_matches` header. [Review](reviews/batch25/StoredWorkflowProvider.md). | 1 → 1 |

## Reuse and follow-through

[`createMemoryRouter`](reviews/batch25/createMemoryRouter.md) in `client/src/components/BaseComponents/test-utils.ts` replaces four inline memory routers in supporting GLink (10 → 10), GButton's local `routerWithRoutes`, and, at review's request, GToast's inline router (10 → 10). It's kept out of `tests/vitest/helpers.js`: `createTestRouter` is the web-history default router `getLocalVue` installs. The ~20 one-line `routes: []` memory routers elsewhere read no clearer adopted, so they're left.

Follow-up queued for batch 26: `PageProvider.test.js` has StoredWorkflowProvider's vacuous shape. Noted: the test file is singular, while the module is `StoredWorkflowsProvider.js`.

Guidance: none.

## Validation and review

66 cases across 6 suites pass: 46 selected, 20 supporting. The selected baseline was 37. Each commit's tests pass at that commit, shuffled with seed `250101`; full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch25/review.md) approved four commits and requested GToast adoption in the helper commit. That was folded in with a fixup before push, then re-verified.

Commits: `786e205027b` (helper + GLink + GToast), `d3461fac485` (GButton), `71bdcee710e` (collectionTypeDescription), `0273c0e1970` (ConfigurationMarkdown), `1577eab6dae` (StoredWorkflowProvider).
