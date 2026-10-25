# Implementation debrief

**STATUS: READY.** Implements [#24377](https://github.com/galaxyproject/galaxy/issues/24377) on `release_26.2`. The branch was re-scoped once (Scope E) and hardened twice. The second scope evaluation recommends keeping the scope as implemented.

The head is `379f1267d54`. It is 6 commits on `fe7b52529a0`, about 103 lines added and 22 removed. The infrastructure commits come first and the fix comes after them:
1. **`218dcc649cf` Mark GCollapse once its open transition has ended.**
   - `g-collapse-shown` class on galaxy-ui `GCollapse`: set on open `transitionend` or when it mounts open, and cleared on any toggle.
   - Vitest, with all 4 marker cases red on base.
   - Registered in galaxy-ui's public-class table (README and `publicClasses.test.ts`).
2. **`a363bc72e26` Wait for history item bodies to finish expanding.**
   - New `content_item.details_expanded` selector (`${_} > .g-collapse-shown`).
   - `history_panel_click_item_title(wait=True)` now waits on it in the open path.
   - Under Playwright, a forced hover used to land mid-animation on the wrong element. This wait fixes that.
3. **`cfa65376cd9` Restore history item button tooltip checks (`Fixes #24377`).**
   - `info_button` changed from `.params-btn` to `.info-btn`.
   - `edit_button` (`.edit-btn`) re-added.
   - Current tooltips, with download matched by its `Download (` prefix.
   - Loop restored.
4. **`876f53c852c` Discarded and deferred button checks.**
   - Display, delete and info tooltips are checked, and download is checked as hidden.
   - Deferred: edit is checked as "Edit attributes".
   - Discarded: edit is checked as `aria-disabled`.
5. **`5dbb553d129`** The dbkey test's fixed sleeps are now waits, about 118s → 26s under Playwright.
6. **`379f1267d54`** The trailing `UX_RENDER` sleep in `_assert_downloadable` is gone. The file has no sleeps left.

Commits 5 and 6 are independent and can be dropped on their own. The original test-only scope is kept as the alt `issue_24377_history_item_buttons_26.2_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

## Key choices
- **Release target.** The check had been a stub since 2022 and was found in 26.2 release testing. `release_26.1` and `dev` have the same stub.
- **Marker class instead of a style selector or a sleep.**
  - Round 1 waited on the inline style (`overflow: visible`).
  - The re-scope added a stable class to the in-repo galaxy-ui package, after confirming it is the `client/packages/ui` workspace package, not an external dependency.
  - The wait now lives in the shared helper, so every caller of `history_panel_click_item_title(wait=True)` gets it. A `.details` element is only visible inside that GCollapse, so no caller that passes today can hang on it.
- **Not fixed here:** the disabled edit button never shows "This dataset is not yet editable.", because `vGTooltip` skips `aria-disabled` elements and blanks the native `title`.
  - The bug isn't new: on 26.1 the button was natively disabled.
  - A fix means moving `ContentOptions` to GButton `tooltip`/`disabled-title` and making the framework's tooltip helpers understand the always-mounted `GTooltip`. Otherwise the restored enabled-edit hover check breaks.
  - Queued at `vault/agents/gx_issues/to_file/history_item_disabled_edit_tooltip.md`.
- **No full `schema.ts` regeneration.** Only the `details_expanded` key was added by hand. A regeneration would pull in older, unrelated drift.
- **Playwright `_hover(force=True)` left alone.**

## Validation (final HEAD)
- **`test_history_dataset_state.py`:** 4/4 under Playwright and 4/4 under Selenium, rerun after every history rewrite.
- **Vitest:** `packages/ui/src` 17 files, 157 tests passed. `vue-tsc`, prettier and eslint are clean. `History/Content` and `DetailBlock` pass.
- **Other callers of the helper, under Playwright:**
  - `test_upload_file` passes.
  - `test_refresh_preserves_state` passes.
  - `test_change_datatype_simple_list` fails before it reaches the helper. Its datatype tab needs Celery, which this local server lacks.
- **Not run locally:** the Tool Shed's `galaxyUi.test.ts`, because there is no `node_modules`. The full E2E suite is left to CI.
- **Local environment:** a fresh Galaxy needs `GALAXY_CONFIG_BUILDS_FILE_PATH=shared/ucsc/builds.txt.sample` for the dbkey test.

## Reviews
- **Normal reviews:** [review 1](subagents/review_1.md) approved. [Review 2](subagents/review_2.md) found it ready to ship; its nits were applied.
- **Codex:** [round 2](codex_review.md) had no findings, and so did [round 1](earlier_drafts/1/codex_review.md).
- **Hardening debriefs:**
  - [test challenges](test_challenges_debrief.md): rewrote 3 vacuous vitest cases
  - [E2E polish](polish_e2e_tests_debrief.md)
  - [baseline refactor](baseline_refactor.md): moved the infrastructure below the fix
  - [scope](scope_evaluation.md): as implemented
  - [screenshots](screenshot_debrief.md): not relevant
  - Round 1 is in [earlier_drafts/1/](earlier_drafts/1/).

## Follow-ups (dev)
- File the queued disabled-tooltip issue.
- A smart-component `aria-disabled` assertion helper. There are 2 callers today: this test and `test_workflow_extraction.py:202`.
- The PR description should say that `navigation.yml` depends on galaxy-ui's `g-collapse-shown` class.
