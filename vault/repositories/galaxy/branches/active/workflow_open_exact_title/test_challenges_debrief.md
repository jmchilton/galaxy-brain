# Test challenges debrief — workflow_open_exact_title (re-harden after re-scope)

**What I changed:** I removed the history-flavored comment above the explicit `workflow_index_open()` in the new management test. The comment was folded into the test commit via fixup and autosquash.

**What I kept:**
- Both E2E tests.
- The explicit `workflow_index_open()` call itself.

**What I didn't add:** a test for the Playwright `find_elements` change.

Branch base is unchanged: `65132d40dac`. Not pushed.

| Commit | SHA |
|---|---|
| Extract `_workflow_card_action` | `8a367e63730` (unchanged) |
| Open the workflow card titled NAME | `3a1cab1b33b` (unchanged) |
| Test opening and running by exact title | `de0dae90db7` (unchanged) |
| Delete and bookmark the card titled NAME | `fac17d4f016` (unchanged) |
| Drop dead name reassignment in undo/redo test | `9653e9ff1cd` (unchanged) |
| Test bookmarking and deleting by exact title | `cb3f2b4131e` (was `553ca2363f7`) |
| Snapshot Playwright find_elements | `786132697dd` (was `51210356c69`), HEAD |

## Not acted on

### No new test for `find_elements` (`786132697dd`)

- **Why no red test is possible.** The race only happens when the list shrinks between `count()` and `nth(i).element_handle()`, inside one call.
  - DOM churn timed to land in that window would be flaky.
  - Patching Playwright's `Locator` would test the implementation.
  - The new code takes a single `element_handles()` snapshot, so there is no window left to inject a shrink into.
- **What already covers the contract.** `test/unit/selenium/test_has_driver.py` checks match count, no matches, single match and `Target` lookup. It runs on `selenium`, `playwright` and `proxy-selenium`. I ran those tests and they all passed (see below).
- **Evidence for the race itself.** The rescope review reproduced it in a standalone Playwright script. That evidence stays in `implementation_rescope_debrief.md`.

### Explicit `workflow_index_open()` in `test_workflow_bookmark_and_delete_by_exact_title`: kept, comment dropped

- **The call is redundant for green runs.** `_workflow_card_action` now opens the list itself.
- **The call is needed for the red check.**
  - The pre-branch `workflow_bookmark_by_name` / `workflow_delete_by_name` don't navigate. Without the call, the old code waits on the home page for the search box and never reaches an assertion.
  - With the call, the old code fails at `assert bookmarked_ids == [workflow_id]` or at `assert remaining_ids == [copy_id]`. The empirical red runs are in `implementation_rescope_debrief.md`.
- **It is also the file's convention.** Every test in `test_workflow_management.py` starts with `workflow_index_open()`, so the line reads as normal without a comment.
- **Why the comment went.** It described the helpers' history ("which the original helpers relied on").
- **Don't drop the call** in a later cleanup, or the red check goes back to hanging.

## Challenge per test

### Unit / API / integration

There are none on the branch. The earlier unit file `test/unit/selenium/test_workflow_index.py` was dropped in pass 1, with John's approval.

### `test_workflow_editor.py::test_open_and_run_workflow_by_exact_title`: kept as-is

- **Matches writing_tests.md and the vault E2E notes:**
  - setup goes through populators (`upload_yaml_workflow`)
  - names are random
  - the UI work goes through smart components and `navigates_galaxy` helpers
  - there are no raw `self.driver` calls and no extra `sleep_for`
- **Red by reasoning:**
  - with the open fix reverted, the editor opens the newer `NAME (copy)` and the exact `==` name check fails
  - with the run fix reverted, the run URL ends with the copy's id
- **The `canvas_loading` wait stays.** Without it, the next `driver.get` can trigger the unsaved-changes prompt (pass 1 analysis). Moving it into the helper is still deferred item D.
- **The "listed first" comment** explains the fixture. Kept.

### `test_workflow_management.py::test_workflow_bookmark_and_delete_by_exact_title`: kept, comment trimmed

- **Same best-practice checks pass.**
- **Waits:** uses `_wait_on` with `DATABASE_OPERATION` for the API-side state.
- **Assertions are exact-set** (`== [workflow_id]` and `== [copy_id]`). Each half discriminates on its own, per the red runs in the rescope debrief.

## Tests run

All runs used a scratch end-to-end config with no `login_email`/`login_password`, so each test registered a fresh user. Each test ran one at a time.

Another session already had Galaxy on 8080 and Vite on 5173/5174, so this pass started its own Galaxy on 8081 (scratch gravity bind) and Vite on 5181. All of those processes were stopped afterwards, and the scratch config was removed.

| Test | Result |
|---|---|
| `pytest test/unit/selenium/test_has_driver.py -k find_elements` | 12 passed (4 tests × selenium / playwright / proxy-selenium) |
| `pytest test/unit/selenium/test_has_driver.py test/unit/selenium/test_smart_components.py -k playwright` | 154 passed, 1 skipped (a pre-existing Playwright skip) |
| `test_workflow_bookmark_and_delete_by_exact_title`, Playwright | PASS (21s) |
| `test_workflow_bookmark_and_delete_by_exact_title`, Selenium | PASS (27s) |
| `test_open_and_run_workflow_by_exact_title`, Playwright | PASS (11s) |
| `test_open_and_run_workflow_by_exact_title`, Selenium | PASS (19s; first Selenium run of this test) |

pre-commit passed on the fixup.

**Side note on the ~30s gap.** The rescope debrief flagged an unexplained ~30s card-action gap. These runs finished in 11–21s under Playwright, which fits the `find_elements` snapshot removing a 30s stall. Load was lower this time, though, so this is suggestive, not proof.
