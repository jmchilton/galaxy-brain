# Scope evaluation

**Recommendation: modest expansion (Scope E).** The work stays on `release_26.2` and adds three pieces:
1. A stable "shown" marker on galaxy-ui's `GCollapse`, with `details_expanded` pointed at it.
2. The settle wait moved into `history_panel_click_item_title(wait=True)`, so every caller that expands an item gets it.
3. Button checks for the discarded and deferred tests.

Reviewers deferred items 1 and 2 to dev for two reasons. The first was "release branch", which the process overrules. The second was that galaxy-ui is a separate library, which turns out to be wrong: `@galaxyproject/galaxy-ui` is an in-repo workspace package (`client/packages/ui`, `"workspace:*"`), so the marker is a few-line in-repo change. Together the three pieces add about 30-40 lines and build the reusable piece instead of a test-local workaround.

The branch has about 21 lines of non-generated code, so there is no decompositions section.

## A. As implemented
Restore `_assert_buttons`, fix the `info_button` and `edit_button` selectors and the tooltips, and wait on `details_expanded` (`.g-collapse-open[style*="overflow: visible"]`) only inside `_assert_action_buttons`. Also replace two fixed sleeps in the dbkey test.

| Pros | Cons |
| --- | --- |
| - Smallest diff<br>- Passes 4/4 under both backends<br>- Approved by review 1 and Codex | - The selector depends on the inline style GCollapse writes<br>- The settle wait helps only this test, while 25 other callers hover or click inside expanded items without it<br>- The discarded and deferred tests still check no buttons |

## B. Move the settle wait into `history_panel_click_item_title(wait=True)`
On the open path, wait for `details_expanded` after `.details` is visible, and remove the wait from `_assert_action_buttons`.

| Pros | Cons |
| --- | --- |
| - Fixes the Playwright forced-hover race for every caller<br>- Safe for every caller | - Changes timing for every caller, and the full E2E suite can't run locally (CI can)<br>- Without C, it still depends on GCollapse's inline style |

<details><summary>Caller survey</summary>

- `wait=True` callers:
  - `test_uploads.py` (4)
  - `test_upload_activity.py` (6)
  - `test_history_options.py` (2)
  - `test_history_panel.py` (1)
  - `test_history_related_filter.py` (1)
  - `test_dataset_metadata_download.py` (1)
  - `test_history_dataset_state.py` (3)
  - `history_panel_ensure_showing_item_details`, through `test_history_panel.py`, `test_collection_edit.py`, `test_visualizations.py` and `navigates_galaxy.py:2799`
- Why it is safe:
  - The helper already waits for `.details` to be visible.
  - `.details` renders inside the item's `GCollapse` (`ContentItem.vue:433`).
  - So any caller that passes today has a `GCollapse` body. That includes `test_collection_edit`, which opens a dataset inside a drilled-in collection.
  - No caller can hang on the new wait unless its transition never ends, and then the real UI would be clipped too.
- The close path (`wait_for_absent_or_hidden`) needs no change.

</details>

## C. A stable "shown" marker on galaxy-ui `GCollapse`
`GCollapse.vue` already emits `shown` in `onTransitionEnd`, and sets the open state in `onMounted` when it mounts open. Add a reactive flag at both points that renders a `g-collapse-shown` class (or `data-state="shown"`), clear it on hide, and point `details_expanded` at `${_} > .g-collapse-shown`.

| Pros | Cons |
| --- | --- |
| - Removes the dependency on GCollapse's inline style, which review 1's main consideration flagged<br>- Every GCollapse gains a testable settled state<br>- In-repo, so no version bump or cross-repo release | - Touches a shipped UI component on a release branch, though it adds only a class and nothing visual<br>- Needs a vitest in `client/packages/ui` covering mount-open, the transition, and hide<br>- Goes beyond the test-only nature of #24377 |

## D. Button checks for the discarded and deferred tests
Call `_assert_title_buttons` and `_assert_action_buttons` in `test_dataset_state_discarded` and `test_dataset_state_deferred`. The expected tooltips would need to vary by state.

| Pros | Cons |
| --- | --- |
| - Covers the only state-dependent tooltip, which no test checks today<br>- Small: per-test expected-tooltip overrides on top of `BUTTON_TOOLTIPS` | - Two more slow E2E runs per backend<br>- Each state's button set must be pinned from the code, below |

<details><summary>Buttons by state (from code)</summary>

- **Title buttons** (`ContentOptions.vue`):
  - display "View": shown for any dataset.
  - edit: "This dataset is not yet editable." when `discarded` (it is in `editDisabled`'s list). "Edit attributes" when `deferred`.
  - delete "Delete".
- **Action buttons** (`DatasetActions.vue`):
  - Download is hidden in both states: `showDownloads` requires `ok`, `failed_metadata` or `error`. The existing `_assert_downloadable(..., False)` already checks this.
  - info "Dataset Details" is gated on `item.accessible`. That flag is permission-based (`HDAManager.is_accessible`), not state-based, so it should show for the owner in both states. Confirm by running the tests.
- Expected sets:
  - discarded: title `display`, `edit` (disabled tooltip), `delete`; action `info`.
  - deferred: title `display`, `edit`, `delete`; action `info`.

</details>

## E. B + C + D (recommended)
The marker (C) gives a stable target, the helper (B) applies the wait to every caller, `_assert_action_buttons` calls the shared helper instead of its own wait, and D extends the restored checks to the two other states the file covers.

| Pros | Cons |
| --- | --- |
| - Builds the reusable piece and routes the issue's case through it<br>- Fixes the related race for every expand caller<br>- Covers every state the file already sets up | - About 30-40 lines more, across client, galaxy-ui and the framework<br>- Needs a CI full-E2E run to confirm the helper change |

## F. Regenerate `schema.ts` in full
Run `client/navigation_to_schema.mjs` instead of hand-adding `details_expanded`.

| Pros | Cons |
| --- | --- |
| - The proposal asked for it<br>- Clears the existing yml/schema drift | - It would pull in unrelated drift that predates the branch, such as `visualize_button` and `dataset_operations_dropdown`<br>- Better done as its own commit or on dev |

## G. Remove the leftover `UX_RENDER` sleep in `_assert_downloadable`
Replace the duplicate `dataset_operations.wait_for_visible()` plus `sleep_for(UX_RENDER)` with a targeted wait.

| Pros | Cons |
| --- | --- |
| - It is the file's last fixed sleep<br>- Fits with `db138499905` | - It saves only about 2s at multiplier 2<br>- If B lands, the details click it precedes already waits properly, so G mostly falls out of B |

## H. Contract: drop `db138499905`
Ship only the fix commit.

| Pros | Cons |
| --- | --- |
| - The PR stays strictly about #24377 | - Gives up an 118s → 26s speedup that has been reviewed and passes under both backends<br>- The commit is already isolated, so a reviewer can ask for it to be dropped |
