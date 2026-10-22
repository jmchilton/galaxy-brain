# Baseline refactor: workflow_editor_selector_escaping (round 2)

The branch now opens with three behavior-preserving refactors on `9699ec45644`: the `css_attribute_value` helper with connector `[id=]` targets, `_saved_step_connections_by_label`, and `_wait_for_single_invocation` (with the round-2 thermo-nuclear fold-in squashed into it). The two fix+test commits follow, one for the editor and one for the run form. The final tree is identical to the pre-rewrite head.

- **Backup:** `workflow_editor_selector_escaping_pre_rewrite_2_20261022` at `af2f6b68da1`.
- **Check:** `git diff workflow_editor_selector_escaping_pre_rewrite_2_20261022 HEAD` is empty.
- **How it was built:** `checkout -B` at `9699ec45644`, then cherry-picks plus file checkouts from the backup. No interactive rebase and no `reset --hard`.

## Layout

| # | New | Old | Commit | Kind |
|---|---|---|---|---|
| 1 | `1d4137a20d7` | `9269c3e687d` | Select editor connectors by quoted [id=] via css_attribute_value | refactor (cherry-picked) |
| 2 | `fd9d178684f` | `11f41f72e31` | Extract _saved_step_connections_by_label editor test helper | test-only refactor (cherry-picked) |
| 3 | `ae7e6cf9b2d` | `0199d579296` + `af2f6b68da1` | Extract _wait_for_single_invocation workflow run test helper | test-only refactor (rebuilt) |
| 4 | `a1b763b1e30` | `248fba718cc` | CSS-escape workflow editor node labels and terminal names | fix + test (cherry-picked) |
| 5 | `7ba4f7bd25f` | `5f0cfe9d558` | CSS-escape workflow run input labels in workflow_run_specify_inputs | fix + test |

## How the work was refactored

- **Commit 3 moved ahead of both fixes.** Before, `0199d579296` was last and also rewrote the new run test. Now the helper commit touches only pre-existing code:
  - the `multiple_integer` / `multiple_text` tests;
  - the two report tests and `_setup_simple_invocation_for_export_testing`, which is the step-1 fold-in `af2f6b68da1`;
  - the `Any` import.
  - It was hand-built: backup file minus the new test.
- **Commit 5 uses the helper from the start.** It is the backup's `navigates_galaxy.py` and `test_workflow_run.py` on top of commit 4, with `5f0cfe9d558`'s message.
- **No failing test-only commits.** Commits 2 and 3 refactor tests that already pass. Each new test lands with its fix, in commits 4 and 5.

## Per-commit checks

Run on each of the 5 commits, checked out detached:
- `uvx ruff@0.17.0 check` and `black --check` on the commit's changed `.py` files: clean.
- Importing `galaxy.selenium.navigates_galaxy`, `galaxy_test.selenium.test_workflow_editor` and `galaxy_test.selenium.test_workflow_run`: OK.

## Tests run (final tree, Galaxy 8095 / Vite 5195, one at a time)

| Test | Playwright | Selenium |
|---|---|---|
| `TestWorkflowRun::test_execution_with_input_label_needing_css_escape` | passed | passed |
| `TestWorkflowEditor::test_connections_with_labels_needing_css_escapes` | passed | passed |
| `TestWorkflowRun::test_execution_with_custom_invocation_report` | passed | passed |
| `TestWorkflowRun::test_execution_with_images_in_report` | passed | — |
| `TestWorkflowRun::test_execution_with_multiple_integer_parameter` | passed | — |
| `TestWorkflowRun::test_workflow_export_file_native` | failed, pre-existing | — |
| `TestWorkflowRun::test_workflow_export_file_rocrate` | failed, pre-existing | — |

**The two export failures** are environmental:
- **Where they fail:** both get past `_setup_simple_invocation_for_export_testing` and time out later, at `[data-export-format=…] .card-title` becoming clickable. That is the export-format card.
- **Same on base:** `test_workflow_export_file_native` fails identically with `9699ec45644`'s `navigates_galaxy.py` and `test_workflow_run.py` checked out. The likely cause is that this dev server lacks the export-plugin / short-term-storage config.
- CI should cover them.

## SHA map for earlier debriefs

The round-2 debriefs cite the pre-rewrite SHAs:
- `9269c3e687d` → `1d4137a20d7`
- `11f41f72e31` → `fd9d178684f`
- `0199d579296` / `af2f6b68da1` → `ae7e6cf9b2d`
- `248fba718cc` → `a1b763b1e30`
- `5f0cfe9d558` → `7ba4f7bd25f`

The original-scope alt branch at `248fba718cc` is unchanged.
