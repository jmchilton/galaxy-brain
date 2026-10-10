# Readability batch 32

Four originators drawn with seed `2610932` from 382 eligible entries, plus a follow-through fix from batch 31. One test per commit, then one range review. [Manifest](readability_batch_32.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| useCommandPalette | Adopts the new `getFakeAnonymousUser`. Readable `it.each` titles replace ones that interpolated the user object. The `setupConfig(config, isLoaded)` flag is gone, since its config was ignored when unloaded. The not-loaded case now also checks `openPalette()` leaves the palette closed, which fails if the guard ignores load state. [Review](reviews/batch32/useCommandPalette.md). | 8 → 8 |
| PermissionsInputField (`.test.js`) | `props`/`global` replace `localVue`/`propsData`; mock clearing moves to `beforeEach`. The `<strong>` check is scoped to GAlert. [Review](reviews/batch32/PermissionsInputField.md). | 1 → 1 |
| historyNodeColor | All 8 expectations are `it.each` rows. A lookup table replaces the nested-ternary mock, and the spy is now restored. New case: underscored states read dashed custom properties, matching `base.scss`; it fails without the production `replace`. [Review](reviews/batch32/historyNodeColor.md). | 4 → 9 |
| ObjectStoreRestrictionSpan | Two-row `it.each`. `title` went from `toBeTruthy()` to a phrase unique to each state, and text is exact. Swapping the branches used to pass and now fails. [Review](reviews/batch32/ObjectStoreRestrictionSpan.md). | 2 → 2 |

## Reuse and follow-through

**WorkflowRun store seed** (supporting fix, 6 → 6). Batch 31's lead was right: `initialState: { user }` never reached `userStore`. The "registered" cases passed only because a null user isn't anonymous. A probe confirmed it: an anonymous seed under the old key passes 6/6, and under `userStore` it fails 2/6. The seed now uses `getFakeRegisteredUser()`. [Review](reviews/batch32/WorkflowRun.md).

**[`getFakeAnonymousUser`](reviews/batch32/getFakeAnonymousUser.md)** sits next to `getFakeRegisteredUser` in `client/tests/test-data/index.ts`. Nine supporting suites adopt it, all counts unchanged: ToolsListCard, CuratedWorkflowCard, WorkflowListTabs, HistoryOptions, WorkflowMissingToolsRequest, userToolCredentials, unprivilegedToolStore, HistoryNavigation and CommandPalette.
- Filler fixture values changed: `nice_total_disk_usage` "0 bytes" → "0.0 bytes", and anonymous `id`s were dropped. The review confirmed nothing reads them, in tests or in the code paths those tests render.
- ToolsListCard also has typing and cast cleanup that `--max-warnings 0` forced once the file was touched.

Follow-ups:
- Adopt `getFakeAnonymousUser` in Masthead (`Masthead.test.js:168`), ToolSuccess (`ToolSuccess.test.ts:19`) and ToolBoxSearch. ToolBoxSearch's unrelated `any`s block the lint gate.
- CommandPalette has six registered-user `as never` literals that could use `getFakeRegisteredUser`.
- Merge `PermissionsInputField.test.js` into its `.test.ts` sibling, which mocks `Services` differently.

Noted, not proposed: the README examples still show `localVue`/`propsData`, though `getLocalVue()` points to `global:`. That's 193 files on the old form vs 27 on the new.

Process note: a mistyped probe briefly changed `PermissionsInputField.vue`. It was restored before any commit, and the range check found no production files.

Guidance: none (batch 31's `initialState` line covers the WorkflowRun bug).

## Validation and review

197 cases across 14 suites pass: 20 selected, 177 supporting. The selected baseline was 15. Each commit's tests pass at that commit, shuffled with seed `320101`; full client vue-tsc passes at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch32/review.md) approved all six commits and checked each fixture change and strengthened assertion.

Commits: `00b6f3f26de` (WorkflowRun seed), `d8487c1f13a` (anonymous-user factory + 9 suites), `f9089bd0ed7` (useCommandPalette), `63064fcb2f2` (PermissionsInputField), `f2df22ee269` (historyNodeColor), `1e6d8358e8f` (ObjectStoreRestrictionSpan).
