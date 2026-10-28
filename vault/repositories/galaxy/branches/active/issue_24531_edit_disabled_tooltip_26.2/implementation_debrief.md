# Implementation debrief

**STATUS: READY**

```
created .../differential-review/snapshots/20261028T161320Z-hardening-e816c0542f05.json
  hardening @ e816c0542f05 vs origin/release_26.2 (merge-base b7f7834d94a4)
  since 20261028T150735Z-implementation-504da7d318b2:
    commits: 1 same, 1 rebased, 1 changed, 5 new, 0 dropped
```

## What

Disabled GButtons using `v-g-tooltip` never showed their tooltip, because the directive skips disabled and `aria-disabled` elements and blanks the native `title`. Those buttons now use GButton's own `tooltip` + `disabled-title` props, which render a GTooltip.

Buttons fixed:
- **History item edit button** ("This dataset is not yet editable."), the issue's target.
- **HistoryNavigation create and switch:** "Log in to …", plus "Switching history..." while a switch is in progress.
- **Multiview create.**
- **Published workflow Edit.**
- **GCard primary/secondary actions:** workflow Run/Edit/Import ("…Restore it first.", "Log in to …"), tool card favorite, history cards.
- **Rule builder Reset/Finish:** Finish now explains validation errors. `TooltipOnHover.vue` is deleted.

Test plumbing:
- **Selenium helper:** `get_tooltip_text` follows `aria-describedby` to a `.g-tooltip` and waits for `data-show="true"`. Otherwise it keeps the old balloon path.
- **Selectors:** `workflow_card_button` (`navigation.yml`) and `JobInformation.test.js` now select by `data-title`, because GButton tooltips drop the native `title`.

## Decisions

- **Base is `release_26.2`:** the bug arrived there with the v-b-tooltip → GButton/v-g-tooltip migration. On 26.1, Bootstrap's `pointer-events: none` blocked hover entirely.
- **Call sites, not the directive:** fixed per call site through GButton's existing mechanism, rather than making `vGTooltip` show on `aria-disabled` elements. That matches the issue's proposal and both scope evaluations.
- **Re-scope:** the first scope evaluation recommended expanding to GCard and the rule builder; done. The original scope is kept as `issue_24531_edit_disabled_tooltip_26.2_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)). The second evaluation says keep the current scope.
- **Left out:** about 25 other `v-g-tooltip` + `:disabled` sites (bulk-action loading buttons, upload and filter controls, `EditableUrl`). They are mostly loading-only, or their titles don't explain the disabled state. Candidates for a `dev` follow-up.
- **Removed test:** the first test-challenge pass removed the ContentOptions tooltip vitest as duplicated by Selenium. The tooltip behaviour is still pinned by `test_history_dataset_state.py` (hover), by the GCard vitest and by the HistoryNavigation vitest. The latter two each fail without their fix and pass with it.

## Tests

- **Full client vitest:** passes after the `JobInformation` selector fix (5088 tests). The targeted reruns pass too.
- **Playwright, headless:**
  - `test_history_dataset_state.py`: 3/4 pass, including the disabled-edit hover.
  - Rule builder `test_uploads.py` rules: 5/5.
  - `test_histories_list.py`: 14/14.
  - `test_workflow_management.py`: 12 pass. 2 bookmark tests errored in the full run and pass when run alone; they look flaky.
- **Not verified:**
  - `test_dataset_change_dbkey` fails at the dbkey dropdown: the apiMel3 option is missing on the local server. The step touches no changed code, but it wasn't checked on base.
  - The Selenium backend wasn't run: no driver or virtual display on this machine.
- **Static checks:** `make format` is clean. mypy (lib config) shows no errors in the changed Python files.

## Hardening

All debriefs are in this directory; the first pass is in `earlier_drafts/1/`.
- **Reviews:** 2 normal reviews, no bugs. Nits were acted on: the GCard test and the selector fix.
- **Codex, pass 1:** a P1 in the helper, `find_element_by_id` raising before the directive's balloon exists. Fixed.
- **Codex, pass 2:** a P2, the switch button's busy title. Fixed.
- **Thermo-nuclear review:** one simplification in pass 1 (WorkflowPublishedButtons `disabled-title`); clean in pass 2.
- **Refactor baseline:** nothing to split.
- **Screenshots:** `screenshots/`. The edit tooltip shot uses a mocked queued state; the deleted-workflow Run card is real.

## Follow-ups

- `release_26.2` advanced during the work; rebase before the PR.
- Optional `dev` issue for the remaining `v-g-tooltip` + `:disabled` sites.
