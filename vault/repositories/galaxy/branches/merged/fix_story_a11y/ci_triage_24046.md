# PR 24046 browser-test triage — 2026-10-11

[Failed job](https://github.com/galaxyproject/galaxy/actions/runs/38141267466/job/114475875547?pr=24046), Playwright shard `Test (3.10, 1)` at `0d7e194649453a63c6f18f54feb8549ce4e6b4c3`. Result: 47 failed, 94 passed, 37 skipped, 2 setup errors. The run’s other shards were still running during initial inspection.

## Conclusion

Every failure in this shard maps to stale test-driver assumptions about the intentional accessibility markup changes. These failures are relevant author work, not unrelated CI, but they do not demonstrate a broken user action. Keep the existing scenarios and assertions; adapt the shared selectors/helpers. No application code was changed during diagnosis.

## History rename: 46 failed cases and both setup errors

`client/src/utils/navigation/navigation.yml:330` still selects `[data-description="name display"] #click-to-edit-input`. `ClickToEdit.vue` now generates instance-local IDs via useId to avoid duplicate input IDs. The shared `history_panel_name_input()` clicks the heading, then waits for the removed fixed ID; most tests never reach their own behavior assertions because their new-history setup calls rename.

The CI debug artifact’s history-rename-cancel snapshot shows a real text input under the name-display div with ID `click-to-edit-v-0`, visible edit-helper labeling, and current value `Unnamed history`; there is no element with the old fixed ID. This is direct rendered evidence, not only inference from source.

Update the shared navigation target to the actual input inside the name-display scope, using stable semantics/data attributes rather than a generated ID. Preserve the unique production IDs and all rename/save/cancel assertions.

## Multiselect: one failed case

`TestToolForm.test_rerun_deleted_dataset` fails at `select_set_value("#col", "3")`, before tool execution and the deleted-dataset assertions. `navigates_galaxy.py:3008` treats the selected node as a container and searches below it for `.multiselect__select`.

The branch declares FormSelection’s id and passes it through to the actual labeled control. The rendered snapshot shows `#col` is now `input.multiselect__input[role=combobox]`, while `#col-container` is the wrapper. The enclosing `.multiselect` has exactly one `.multiselect__select` caret, and the input itself has none. The caret was not removed; the helper starts from the wrong node.

Adapt the driver to the actual combobox/container relationship (or target the explicit wrapper where appropriate), preserving selection and deleted-dataset checks. Review other helpers/call sites that assume a form-field ID names the outer wrapper; do not revert the label/control association merely to satisfy selectors.

## Evidence and limits

Downloaded failed-job log via the completed-job logs endpoint because the overall run was still active. Parsed the final summary: 46 fixed-ID rename failures, one missing-caret descendant failure, and two fixed-ID rename setup errors. Inspected selected page_source snapshots from [debug artifact 11704401670](https://github.com/galaxyproject/galaxy/actions/runs/38141267466/artifacts/11704401670). Original artifacts and full logs stay in temporary storage, uncommitted.

- Log: `/tmp/fix_story_a11y-pr-job-114475875547.log`.
- Results artifact: `/tmp/fix_story_a11y-pr-results.zip`.
- Debug artifact: `/tmp/fix_story_a11y-pr-debug.zip`.

This diagnosis does not claim a full live-server rerun or certify other shards. A focused rename/save/Escape-cancel and tool-select rerun should validate the eventual driver changes. No new product bug is established by this shard.
