# galaxy_ui_driver upstreaming

Long-running task (John, 2026-10-09): break `galaxy_ui_driver` down and land its Galaxy fixes in
dev. Replaces the old "decide what to pull out at the end" rule.

## Rules

- Each PR comes off dev and holds one theme from the commits below the gxui tip.
- Prefer PRs that grow E2E coverage. A fix or abstraction lands with a Selenium/Playwright test
  that uses it, so the suite becomes its regression test and the PR has a non-gxui motivation.
- **`galaxy_ui_driver` sits on `release_26.2` for now** (John, 2026-10-20). It drives 26.2 QA,
  so its `navigation.yml` has to match the release. Once a PR merges, restack onto
  `release_26.2` and drop its commits if 26.2 has them. A dev-only merge keeps its commit, as
  #24139 does. gxui stays the tip.
- **The final gxui PR targets dev.** Rebase onto dev before opening it.
- Commits only gxui motivates (CDP port, storage state) go up with gxui. They don't get
  separate PRs.
- Branch records, PR descriptions and opening follow `vault/agents/gx_branches/`.

## Breakdown (John, 2026-10-09)

Easiest first. Commit numbers follow the queue in `GALAXY_UI_SKILL_DESIGN.md` ("Prerequisite
PRs").

**1. Two standalone fixes, in parallel.** Both merged: [#24142](https://github.com/galaxyproject/galaxy/pull/24142)
and [#24139](https://github.com/galaxyproject/galaxy/pull/24139). The 2026-10-20 rebase onto `release_26.2`
dropped #24142's commit. #24139's commit stays because it is on dev only.
[`tool_open_tool_shed_ids`](../../repositories/galaxy/branches/merged/tool_open_tool_shed_ids/index.md),
[`playwright_timeout_retry_once`](../../repositories/galaxy/branches/merged/playwright_timeout_retry_once/index.md).
- **Tool Shed ids in `tool_open`** (4a). A real tool panel bug: searching by a Tool Shed id finds
  nothing. The `tools_list` card selectors (invalid CSS for a Tool Shed id) were folded in on
  2026-10-11. Tested by vitest and by `integration_selenium` E2E tests that install a real Tool Shed
  tool, in the same way `test_workflow_repository_tool_update.py` already does.
- **Retry a Playwright timeout once** (7b). Its own PR because it changes timing for every
  caller of `retry_call_during_transitions`. A stuck Playwright action now fails after 2 action
  timeouts, not 12. The PR says upfront that it partly reverts `2825bb09e42` ("Try to fix transiently failing
  test?", 2026-03-22), which made Playwright timeouts retryable. That commit's CI run is gone and
  John isn't worried about the flake returning: the change justifies itself.

**2. Coverage PRs.** Implemented 2026-10-20 on `release_26.2`: John wants them in the release, framed
as missing tests (a bug). Each brings the fixes its test needs, tests green under both backends
and red without each fix. Queued in `MY_BRANCHES.md`; no PRs yet.

| Branch | Commits | Coverage added |
|---|---|---|
| [`workflow_editor_run_cancel`](../../repositories/galaxy/branches/active/workflow_editor_run_cancel/index.md) | 4b, 7h, 7j | run from the editor's Run activity, pick a non-default dataset in the simplified run form, cancel |
| [`workflow_open_exact_title`](../../repositories/galaxy/branches/active/workflow_open_exact_title/index.md) | 7c, 7g | open and run a workflow whose title prefixes a newer one's |
| [`workflow_editor_second_subworkflow`](../../repositories/galaxy/branches/active/workflow_editor_second_subworkflow/index.md) | 7d | insert two subworkflows from the editor's Workflows panel |

- **7i moved to step 4.** On 26.2 the list search opens `X: Y`, `X:Y` and `tag:Y` titles without
  it (dev's `filtering.ts` is the same); it only works around test.galaxyproject.org's older client.
- **Follow-up.** `workflow_run_setup_inputs` drops `type: File` inputs, so existing
  `workflow_run_specify_inputs` callers select nothing and pass on the form's preselected dataset.

**3. Area PRs.** Implemented 2026-10-20 on `dev` (enhancements, so not 26.2). New tests are
green under both backends and red without their change. Queued in `MY_BRANCHES.md`; no PRs yet.

| Branch | Commits | Tests |
|---|---|---|
| [`selenium_tool_form_helpers`](../../repositories/galaxy/branches/active/selenium_tool_form_helpers/index.md) | 6a, 6a′, 6b, 6c, 7a, 7e, 7f | new E2E: fill an editor step's form (7a), describe a rerun form (6c); `test_tool_form.py` 29/29 |
| [`selenium_multiview_copy`](../../repositories/galaxy/branches/active/selenium_multiview_copy/index.md) | 4c, 5e | 5e's copy E2E, red without 4c's hooks; Multiview file green |
| [`selenium_standalone_package`](../../repositories/galaxy/branches/active/selenium_standalone_package/index.md) | 5a, 5b, 5c, 5d, 7k, 7l, 7n + consumer | `GalaxySeleniumContext` includes `UsesUploadActivity`; new E2E uploads through a standalone context; upload/extraction spot checks |

- The consumer commit drops every test class's own `UsesUploadActivity` mixin (MRO), and 7k
  picked up dev's newer `test_workbook_mapping.py` import. gxui's `GxuiContext` can drop its mixin
  once this merges.
- These merge to dev only, so their commits stay on `galaxy_ui_driver` until it restacks onto a
  base that has them.

FAQ-loop commits ([HARDEN_AGAINST_FAQ.md](HARDEN_AGAINST_FAQ.md)) land below gxui too. So far:
- `c31fcb13a8e`: a docstring on `NavigatesGalaxy.register` (`inspect.getdoc` showed
  `ABC.register`'s). Fold it into the `galaxy.selenium` PR.
- `4d391ac7e36`: coverage for `account_create`. It adds `register(via_masthead=True)`, an
  `inactivity_box` component and `test_user_activation.py` (register, banner, resend, activate). A
  standalone coverage PR candidate, like step 2. It is green under Playwright only so far.
- `8d36a3bd9f3`: coverage for `activity_bar_how_to_enable`. `test_activity_bar.py` hides and shows
  an activity from the More panel; adds `activity_bar` components. Coverage PR candidate; green under
  Playwright only.
- `12c8ec3d7c7`: renames `preferences.activity` to `activity_bar.more`. It edits
  `upload_activity_helpers.py`, which `50ac1760a58` creates, so it goes with the `galaxy.selenium`
  PR, or with `8d36a3bd9f3` if that lands first, touching the older caller.
- `2782db29ee2`: coverage for `analysis_add_custom_build`. `test_custom_builds.py` makes a build
  from a history fasta; adds `custom_builds` components, and `len`/`linecount` plus the
  `fasta -> len -> linecount` converters to the framework datatypes. Coverage PR candidate. Green
  under Playwright only; `test_datatypes.py` API tests still pass.
- `f19d8ec90f8`: `tool_form_fill` switches a dataset field to collection mode for a collection hid
  and fails when the selection doesn't land (was a silent no-op). Test in `test_tool_form.py`, red
  without the fix. `tool_form_fill` came from 6a, so this goes with `selenium_tool_form_helpers`.
- `a67081d346c`: coverage for `analysis_jobs_not_running`. `test_user_activation.py` checks that an
  inactive user's upload fails with "Action requires account activation."; adds
  `upload_activity.progress_row_error(row)` and the `UsesUploadActivity` mixin on that class. Goes
  with `4d391ac7e36`.
- `d58f510c7c0`: coverage for `analysis_troubleshooting`. `test_dataset_error_report.py` opens a red
  dataset's error page from its bug icon and submits a report (mock SMTP + `error_email_to`); adds
  `dataset_error`, `email_report` and `content_item.error_button` components, an
  `email-report-result` class on `EmailReportForm`'s result alert, and two helpers. Coverage PR
  candidate; green under Playwright only.
- `a51d2b9ed4a`: coverage for `bulk_change_datatype`. `test_history_panel.py` changes two selected
  datasets' data type from the Selection menu; adds a `data-description` on the modal, a
  `multi_operations.change_datatype_modal` component and `history_panel_change_datatype_of_selected`.
  Extracted with `93b1f03b432` into
  [`selenium_history_datatype_citations`](../../repositories/galaxy/branches/active/selenium_history_datatype_citations/index.md)
  (`release_26.2`, 2026-10-21), widened to Change Database/Build through a shared `operation_modal` /
  `history_panel_change_selected`. On restack, drop both commits and point gxui's
  `history-change-datatype` verb at the new helper.
- `93b1f03b432`: coverage for `cite-tools-used-in-a-history`. `test_history_options.py` opens
  History options > Export Tool References and checks both tabs; adds `data-description`s on the
  menu item and tabs, a `citations` component and `click_history_option_tool_references`. In
  `selenium_history_datatype_citations` (see above).
- `e31b6908bec`: coverage for `collections_autobuild_list`. `test_collection_builders.py` builds a
  list with "Remove file extensions?" off and checks identifiers keep `.fasta`; adds a
  `list_wizard.remove_extensions` component and `collection_builder_toggle_remove_extensions`.
  Coverage PR candidate; green under Playwright only, red without the toggle.
- `7bea524600b`: renames `history_panel_muli_operation_select_hid` to `..._multi_...` (3 callers).
  Goes with whichever PR lands `a51d2b9ed4a`'s caller, or alone.
- `b96ef661d45`: coverage for `collections_convert_datatype` (and `collections_change_datatype`).
  `test_collection_edit.py` converts a fasta list with "Convert FASTA to Tabular"; adds convert-tab
  components, `collection_edit_convert`, and moves the test's change-datatype steps into
  `collection_edit_change_datatype`. `history_panel_collection_edit(hid)` replaces the bare
  `.edit-btn` `collection_menu_edit_attributes`, which relied on the collection being the first item. Adds
  `history_wait_for_new_collection(after_hid)` (also used by `00c72c7fa3c` and gxui). Coverage
  PR candidate; green under Playwright only (file 3/3).
- `cdc5c200548`: coverage for `collections_build_list`. `test_collection_builders.py` builds a list
  through Advanced Build List > Flat List and renames an element; adds `list_wizard.element_name`/
  `element_name_input` and `collection_builder_rename_element`. Pairs naturally with `e31b6908bec`.
  Green under Playwright only.
- `e31b6908bec`, `b96ef661d45` and `cdc5c200548` were extracted into
  [`selenium_collection_build_convert`](../../repositories/galaxy/branches/active/selenium_collection_build_convert/index.md)
  (`release_26.2`, 2026-10-21). It also adds a refactor commit and a fix for Convert Collection always
  being enabled. On restack, drop all three by subject; the convert commit's patch differs.
- `00c72c7fa3c`: coverage for `collections_force_mapping_over`. `test_tool_form.py` nests a list with
  Apply rules through the Column > Basename and column definition menus (other Apply rules tests set
  the rule source JSON), then checks Sort collection maps over the `list:list`. Adds
  `rule_builder_add_column_basename`. Needs `b96ef661d45`'s `history_wait_for_new_collection`.
  Green under Playwright only.

**4. gxui** with 2 (CDP port), 7m (storage state) and 7i (colon-free workflow search).

## Starting a PR

- Pick the commit off the current `galaxy_ui_driver` by subject; hashes change on every restack.
- Branch off a freshly fetched `origin/dev` and cherry-pick it there. Re-run its tests on the new
  base.
- Step 1 branches: `tool_open_tool_shed_ids` (4a, "Let tool_open find Tool Shed tools by id") and
  `playwright_timeout_retry_once` (7b, "Retry a Playwright timeout once during transitions, not
  ten times"). Neither needs an E2E run, so a per-branch worktree under `WORKTREES.md` is fine.
- Hand off per `vault/agents/_shared/GX_IMPLEMENTATION_HANDOFF.md`: branch record, a
  `MY_BRANCHES.md` line, push to `jmchilton`. Note in the record that the commit comes from
  `galaxy_ui_driver` and gets dropped from it on merge.

## Open questions

- Is the standalone-selenium PR too big? 7k alone moves about 1,000 lines.
