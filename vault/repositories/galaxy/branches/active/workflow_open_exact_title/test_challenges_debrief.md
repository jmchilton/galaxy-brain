# Test challenges debrief — workflow_open_exact_title

Acted on: E2E test hardened against the unsaved-changes hazard. Card helpers now take navigation.yml targets for the edit and run buttons. Not acted on: dropping the unit test file. The process says drop it, but the auto-mode permission classifier blocked deleting it, so John has to decide.

Branch on same base `65132d40dac`, fixups autosquashed, not pushed:

1. `74e61e98338` Open the workflow titled NAME in workflow_index_open_with_name
2. `c040d5a8a73` Open the run form of the workflow titled NAME in workflow_run_with_name
3. `89753589c48` Test opening and running a workflow whose title prefixes another's

## Not acted on

- **Drop `test/unit/selenium/test_workflow_index.py`.** Recommended; needs John (`git rm` was denied).
  - Exact-vs-longer test duplicates the E2E test (`NAME` vs newer `NAME (copy)` listed first).
  - The stale-element half tests a defensive branch that copies the standard `exception_indicates_stale_element` idiom. It tests the implementation directly.
  - Both fail on base with `AttributeError` (the private method doesn't exist yet), not at their own assertions. That breaks the red-check rule.
  - It fakes `self` with `SimpleNamespace` to call a private unbound method. Switching to dataclasses would polish a test that shouldn't exist.
- **Card title selector still hardcoded** in `_workflow_card_named` (`'[id^="g-card-title-"] a'`). Using `navigation.workflows.workflow_card_title` breaks the unit fakes, which have no `navigation`. Swap it in once the unit file is dropped.

## Changes

### navigation.yml reuse (folded into commits 1 and 2)

`_workflow_card_action(name, action: Target)` now clicks `card.find_element(*action.element_locator)`. Callers pass `self.navigation.workflows.edit_button` and `self.navigation.workflows.run_button`, which already exist, replacing duplicated raw selectors.

### Unsaved-changes hazard (folded into commit 3)

The hazard is real on 26.2. `workflow_index_open()` calls `home()`, which does `driver.get`. The editor's `hasChanges` emits `update:confirmation`, and `App.vue`'s `window.onbeforeunload` then prompts. `loadEditorData` keeps `hasChanges` true until `getVersions` returns.

`loadingWorkflow` stays true through that whole load and drives the canvas `LoadingOverlay`, so waiting for the shade to go away is enough.

- Added `canvas_loading: '#workflow-canvas .galaxy-loading-shade'` right after `canvas_body`. The hunk content is byte-identical to sibling `workflow_editor_run_cancel` (`82b94422d2d`); only the line offset differs.
- The test now waits for `canvas_body` to be visible, then for `canvas_loading` to be absent, before asserting. That also makes sure `#workflow-name` holds its value before the exact `==` compare.

## E2E: `test_open_and_run_workflow_by_exact_title` — kept

- Red → green by reasoning:
  - All fixes reverted: the editor opens `NAME (copy)` and the `==` name check fails.
  - Only the run fix reverted: the run URL ends with the sibling's id.
  - Both fail at the test's own assertions.
- Shared `assert_wf_name_is` (which matches with `in`) left alone, since sibling branches touch the file.
- Matches writing_tests.md and the vault E2E notes: helpers live in `navigates_galaxy.py`, selectors in navigation.yml, populators handle setup.

## API/Integration

None in branch.

## Tests run

- `pytest test/unit/selenium/test_workflow_index.py`: 2 passed.
- `pytest test/unit/selenium/`: 523 passed, 3 failed, all in `test_driver_factory.py::TestConfiguredDriverSelenium`. That suite launches a real Selenium browser; rerunning it hangs locally. The branch doesn't touch that code, so it's an environment problem, not this branch.
- Playwright, headless: `test_open_and_run_workflow_by_exact_title` passed (23.7s).

## Follow-up (coordinator)

John approved dropping `test/unit/selenium/test_workflow_index.py`. Removed inside 7c via fixup; `_workflow_card_named` now uses `navigation.workflows.workflow_card_title`. New SHAs: `20a45535744` (7c), `ea93463da46` (7g), `53415a775f5` (test). E2E rerun is covered by the polish pass.
