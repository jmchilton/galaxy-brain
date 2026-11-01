# Re-scope debrief

**Trigger:** John asked for the branch to be retargeted (`dev` → `release_26.2`, clean rebase) and hardened, since it never had been. During hardening, the test challenge found a Multiview bug: `historyDragDrop.ts` used `datasetCount > 0 && collectionCount > 0` where `||` was meant (from `c7423339250` / #18699). So after a drop of only datasets, or only collections, the copy succeeded on the server but the target column didn't refresh. The scope evaluation (`earlier_drafts/1/scope_evaluation.md`) recommended expanding: the bug sits in the flow this branch adds a helper for, and its natural regression test needs this branch's per-column hooks.

**Original scope** kept as `selenium_multiview_copy_alt_original_scope` at `71765406881` ([alts/original_scope.md](alts/original_scope.md)).

**Expansion** (head `20b3266c03d`, 6 commits on `release_26.2`):
- `767300d33b6` Baseline tests: new `historyDragDrop.test.ts`, 4 cases that already pass under `&&`.
- `a4d4ca91b28`…`16d1e4b65b6` are the hook, selector, helper and E2E commits from before, unchanged apart from rebased SHAs.
- `20b3266c03d` is the fix (`&&` → `||`), 3 new vitest cases, and the E2E copy test now waits for the item in the target column, with the screenshot taken after the drop.
- Side effect: a single-type drop onto the "new history" box pins histories again, as it did before Aug 2024. No other caller passes `pinHistories=true`.

**Red/green:** under `&&`, exactly the 3 new vitest cases fail, and the strengthened E2E times out on the target-column selector. At head, vitest passes 7/7 and Playwright passes `test_history_multi_view.py` 6/6. Selenium not run locally (no chromedriver).

**Review** ([subagents/rescope_review.md](subagents/rescope_review.md)): the pin vitest cases were switched to the real `(undefined, true, true)` call shape, two redundant E2E waits were dropped, and the PR description wording was fixed. Nested `_wait_on(wait_for_text)`, the `data-history-id` hook and the selector names were left as they are.

**Open:** base is still `release_26.2`, though the bug exists back to `release_25.1`. There is no 25.1 test vehicle, so the fix could be cherry-picked there later.
