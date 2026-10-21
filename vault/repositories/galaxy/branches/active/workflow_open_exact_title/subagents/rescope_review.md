# Rescope review — workflow_open_exact_title (scope B)

**Top line: I added one commit, `51210356c69` "Snapshot Playwright find_elements instead of count then nth". HEAD is now `51210356c69`. The scope-B commits themselves are correct under static review and needed no changes.**

**The new commit fixes a real Playwright-only race in `has_playwright_driver.find_elements` (sequence below), which the branch's title gate polls through `.all()`.** It is the most likely cause of the ~30s per-call gap flagged in the rescope debrief, but that link is **not proven**.

**The race:**
1. `find_elements` called `locator.count()` and then `locator.nth(i).element_handle()` for each index.
2. If the list shrinks in between, each trailing `nth(i)` waits out Playwright's default 30s timeout (no default timeout is set) and raises `TimeoutError`.
3. That error propagates out of `_wait_on` to `retry_call_during_transitions`, which retries and succeeds. That gives about 30s, then success, and only under Playwright.

**What was confirmed:**
- A scratchpad Playwright probe on a static page confirmed the wait semantics: `nth(2).element_handle()` timed out after the list shrank, while `element_handles()` returned at once.
- Its precondition is plausible here. A search shrinks the shared login user's 24-workflow list, and the cards are keyed by id, so the non-matching ones unmount.

**What was not shown:**
- One Playwright run of `test_workflow_bookmark_and_delete_by_exact_title` passed, with a 3.6s call (fresh user, quiet machine, Galaxy managed by the framework).
- The same test without the fix also passed, in 3.4s.
- So a fresh user (whose list never shrinks) doesn't reproduce the gap, and the fix is not empirically shown to remove it.

**The commit stands alone.** It sits at HEAD, touches only the adapter, and `git merge-tree` is clean against both siblings. pre-commit and mypy pass. It can be dropped or split into its own PR if John prefers to keep the branch to workflow helpers.

## Not acted on

| Item | Why not |
|---|---|
| The delete item lookup and click run outside `retry_call_during_transitions`, on the card returned from the toggle step | The card list is keyed by `workflow.id` (`WorkflowCardList.vue:98`). Search reloads use `load(true)`, which keeps the cards mounted under `GOverlay`. The settled title gate means no further reload is pending. Revisit only if flakes appear. Any retry must not cover the toggle click, because a second toggle closes the menu. |
| The explicit `workflow_index_open()` in the new test, and its comment ("...which the original helpers relied on") | It is redundant with the new helpers, and the comment describes old code. It does keep the red check reproducible, though: base hangs on the home page without it. Leave the call to coordinator or John at PR time. |
| Proving the ~30s gap is gone | That needs a run whose list shrinks under search, e.g. the shared login user with many workflows. Do it during the next E2E pass. |
| `_workflow_card_titled` / `_workflow_card_named` have no return annotation | Cosmetic. They match the surrounding untyped helpers. |
| Stray Galaxy/celery processes from this worktree, started 12:12, 13:56, 19:12 and 19:25 (including the thermo-review `run.sh`) | Earlier sessions started them, not this review. They were left running for the coordinator to stop. |

<details>
<summary>Full review</summary>

## Scope and verification
- The worktree has `workflow_open_exact_title` checked out at `553ca2363f7`, on base `65132d40dac`.
- I reviewed the full `65132d40dac..HEAD` diff, with emphasis on `fac17d4f016`, `9653e9ff1cd` and `553ca2363f7`.

## Retry semantics in `_workflow_card_action` and `workflow_delete_by_name`
- `click_action` re-runs the title gate and the click together on each retry. That is correct, because a stale card from a previous attempt is never reused.
- The retry covers stale-element errors, intercepted clicks, not-clickable errors and Playwright `TimeoutError` (`navigates_galaxy.py:163`).
- Playwright's "not attached to the DOM" also counts as stale (`has_driver.py:820`).
- Delete returns the card after the dropdown click, then looks up the item inside it outside the retry. When the card could go stale:
  - Only on a list re-render that removes or re-keys that card.
  - `WorkflowList.vue` triggers re-renders from the filter/sort watcher, which calls `load(true)` (overlay, cards stay mounted).
  - Bulk ops and `refreshList` also re-render, but nothing fires them here.
  - The title gate guarantees that the filtered response has already rendered.
- The risk is therefore negligible, and it was not changed (see the table above).

## Selenium vs Playwright parity
- **Child lookup.** `card.find_element` on Playwright is `ElementHandle.query_selector` (`playwright_element.py:190`). On a miss it raises a generic `Exception`, not a stale or transition error, so a missing child fails fast on both backends. That is fine, since the action children always render.
- **`is_displayed`.**
  - Playwright `is_visible` versus Selenium `is_displayed`: both treat the dropdown menu's hidden state as hidden, because `GDropdown` toggles the menu's display rather than its opacity.
  - Both backends pass `test_workflow_bookmark_and_delete_by_exact_title`, `test_workflow_delete` and `test_workflow_bookmark_filtering`.
- **Click.**
  - The Playwright click goes through `ElementHandle.click()` with no locator (`playwright_element.py:69-75`). That runs Playwright's full actionability wait, up to the default 30s.
  - Selenium raises an intercepted or stale error at once, and the retry sleeps briefly.
  - So any transient blocker costs about 30s per attempt under Playwright, against about 0.5s under Selenium. See the next section.

## The ~30s gap (likely cause found and fixed; not reproduced)
- **Update, written after the analysis below.**
  - **The likely cause** is a race in `PlaywrightDriver.find_elements`, which ran `count()` and then `nth(i).element_handle()`. The title gate polls it through `.all()`. When a search re-render shrinks the list between those two calls, each trailing `nth(i)` waits out the default 30s timeout and raises `TimeoutError`. `retry_call_during_transitions` then retries and succeeds.
  - **The semantics are confirmed** by a probe on a static page.
  - **The fix is commit `51210356c69`**, which takes one `element_handles()` snapshot.
  - **Before/after** with a fresh user: call times were 3.6s with the fix and 3.4s without. That user's list doesn't shrink, so neither run reproduced the gap.
  - **The "still possible" list below is superseded** by this cause, but the link to the gap remains unproven.
- **What the rescope debrief saw.** Galaxy's access log showed 30-34s between the search request and the action, for bookmark, delete, and the original-scope open/run path.
- **Causes checked statically and ruled unlikely:**
  - **Overlay blocks the click.** The filter watcher does call `load(true)`, which sets `overlay`, and `GOverlay` (`client/packages/ui/src/components/GOverlay.vue`) is an absolutely positioned `z-index:10` div. In the new tests every listed title contains NAME, so the title gate can pass on the pre-search list while the overlay is still up. But Playwright keeps retrying the hit-target check, so the click should land as soon as the overlay is removed (one request, under 1s), not after 30s.
  - **Detached handle.** The cards are keyed by id and stay mounted. A detached handle would also raise "not attached" at once, which the retry treats as stale.
  - **Card remount through the `v-if` at line 461.** That needs `loading`, which only the initial `load()` sets (`fetching`), not the search.
- **Still possible:**
  - the 30s sits somewhere other than the click: the gate polling while the debounced search fires more than once, or `_inline_search_for`;
  - the first matching child is temporarily unactionable under Playwright only;
  - the gap was already present on base (base was never measured).
- **Suggested next step.** One Playwright run of `test_workflow_bookmark_and_delete_by_exact_title` with `DEBUG=pw:api`, on a quiet machine. The click call log will name the cause: "intercepts pointer events", "not attached", "not stable", or a missing click log, which would put the time elsewhere. Run the same test on base for comparison.
- **Candidate fixes, depending on the result:**
  - **If it is the overlay:** have `_workflow_card_named` return None while `#workflow-cards .g-overlay` is present. There is no existing navigation.yml key for it, so add one under `workflows:` and re-check `git merge-tree` against the siblings.
  - **If it is the handle-click actionability wait:** click through a card-scoped locator instead of a handle. Don't change `PlaywrightElement`: the adapter is for selector semantics.
- **Where the fix goes.** The gate came in with `3a1cab1b33b`, so a fix would be a fixup onto that commit. That would make the parent diverge from `_alt_original_scope`.
- **Impact if real.** Up to 30s per by-name call. That covers about 27 open/run callers plus bookmark and delete, on Playwright CI only.

## Callers of the helpers that now open the list themselves (checked statically)
- **`test_workflow_management.py::test_workflow_delete`**
  - It renames on the list, then calls `workflow_delete_by_name("fordelete")`. The helper re-opens the list (an extra `home()` navigation), searches, and deletes.
  - The following `workflow_not_found_message` assertion still holds, because the helper's own search leaves the "fordelete" filter applied.
- **`test_workflow_bookmark_filtering`**
  - It bookmarks "forbookmark", then calls `workflow_index_search_for("is:bookmarked")`. `escape_to_clear` replaces the helper's term.
  - Nothing filtered or stateful exists before the call, so the re-open loses nothing.
- **The new test.** It is the only other caller.
- **No other callers.** There are none in `lib/galaxy_test`. gxui consumes these helpers but always benefits from the self-contained navigation.
- **Open/run callers.** The ~27 callers of `workflow_index_open_with_name` / `workflow_run_with_name` (including `framework.py:1396`) are unchanged by the rescope. They already opened the list on base.

## Abstractions
- **The shared lookup.** `_workflow_card_titled` (gate + wait) / `_workflow_card_action` (find + click under retry) is now shared by all four by-name list actions. That is the reusable abstraction scope B asked for, and it leaves no duplicated by-name logic on the workflow list.
- **Neighbouring helpers.** `workflow_card_element(workflow_index)` / `workflow_index_name` are index-based and serve a different purpose, so they are not duplicated.
- **The delete comment.** "Every card renders its own (hidden) menu, so the item must come from this card" is a non-obvious, load-bearing comment. Keep it.

## Imports
- `test_workflow_management.py` imports `WORKFLOW_SIMPLE_CAT_TWICE` at module top, ahead of the relative imports, which is isort-compliant (pre-commit passed per the rescope debrief).
- `navigates_galaxy.py` adds no new imports.

## Test strength
- **The test discriminates.** The rescope debrief has red evidence for each half on its own:
  - old bookmark: the copy was bookmarked;
  - new bookmark with old delete: the copy was deleted.
  - Both assertions compare exact id lists, not counts.
- **The bookmark wait.** `_wait_on` gets a list. An empty list is falsy, so it waits until some match is bookmarked, then asserts it is exactly NAME's id. That is correct.
- **The delete wait.** It waits until one match remains and asserts it is the copy. That is correct.
- **No tests were weakened.** `9653e9ff1cd` only drops a dead `name =` assignment (the helper returns None and `name` is not read afterwards).

</details>
