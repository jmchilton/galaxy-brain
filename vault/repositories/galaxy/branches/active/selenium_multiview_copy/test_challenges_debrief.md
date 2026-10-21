# Test challenges debrief (re-harden, 2026-10-21)

Head `8c1c7d48839` (was `20b3266c03d`). Still 6 commits on `release_26.2`: Baseline tests first, fix last. Force-pushed to `jmchilton`.

## Changes
- **Copy API is mocked with MSW, not `vi.mock("@/api/datasets")`.** client/README prefers `useServerMock`. A `beforeEach` handler on `POST /api/histories/{history_id}/contents/{type}s` records each request's history id, content and source. Tests assert on those requests instead of `copyDataset` spy args. The failed-copy case answers with a 5XX, so it goes through `rethrowSimple` and the composable's catch. The change is folded into both the Baseline and fix commits.
- **Dropped the vitest "refreshes the target history after copying only a dataset" case.** `test_copy_dataset_between_columns` proves the same thing end to end (a dataset dropped on a column renders there), so per the challenge rule it was a duplicate.
- `pr_description.md`: vitest count is now 6/6, the red/green list drops dataset-only, and the checklist mentions MSW.

## Kept, and why
- **Collection-only refresh (vitest, fix commit).** It's the same branch as the E2E dataset case. It could become a second E2E test using the same helper, but the vitest harness has to stay for the pin cases anyway, and a near-duplicate E2E isn't worth the cost.
- **Pin cases** (mixed in baseline, dataset-only in the fix). These need a pinned Multiview plus the "new history" box, which isn't easy to set up in E2E. They use the box's real `(undefined, true, true)` call shape.
- **Failed copy and same-history drop** (baseline). These are cheap guards with no E2E equivalent.
- **Stubbed store actions** (`loadHistoryById`, `pinHistory`, `createNewHistory`). They are the composable's observable output, so asserting on them doesn't test the implementation.
- **Both E2E tests unchanged.** They use populators for setup, navigation.yml selectors and `data-description` hooks, a reusable `NavigatesGalaxy` helper, and screenshots after the state changes.
- **Switch test's `_wait_on(wait_for_text() == ...)`.** The documented alternative, `retry_assertion_during_transitions`, only retries for about 1s, which is too short for the column name to load. There's no SmartTarget "text equals" wait.
- **No `copyHistoryItems` reuse.** `api/datasets.ts` already maps items to type/source, and the composable duplicates that. Switching would change the error semantics (it collects failed ids instead of throwing) and add concurrency, which is too wide for a one-operator release fix. It's a possible follow-up.

## Red/green
- Baseline commit `2b530b5fb65` against the base composable (`&&`): vitest **4/4 pass**.
- At head with `||` reverted to `&&`: exactly **2 fail** (collection-only, dataset-only "new history" box). Both fail at their own `loadHistoryById`/`pinHistory` assertion, and their request assertions pass. The other 4 pass.
- Head: vitest **6/6 pass** (node 22.20.0). eslint, prettier and `vue-tsc --noEmit` are clean. The `@ts-expect-error` is still needed.
- E2E: I reasoned about this rather than running it. The copy test times out on the target-column item under `&&`, and both tests time out on their selectors without the Vue hooks.
- Playwright run headless against an isolated Galaxy on 8082, with Vite on 5175 as the target. `test_copy_dataset_between_columns` and `test_switch_to_history_from_column` each passed on their own, and the whole `test_history_multi_view.py` passed **6/6**. Servers were stopped afterwards. Selenium wasn't run (no chromedriver), so CI has to confirm it.
